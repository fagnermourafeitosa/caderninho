const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');
const { installTemporal, event } = require('./temporal.cjs');
const {installCategories,category,associate,detach,syncCategories,categoryState}=require('./categories.cjs');
const {COLORS,installNotebooks,getNotebook,activeNotebook,notebookCommand,notebookState}=require('./notebooks.cjs');
const pageDocument=require('../shared/editor-document.js');
const {installSourceActions,sourceActions,sourceCommand,dueSourceActions}=require('./source-actions.cjs');
const {installBoards,createEmptyBoard,boardsWithThumbnail}=require('./boards/infrastructure/sqlite-board-repository.cjs');
const {installPipelines,createPipelineColumns}=require('./pipelines/infrastructure/sqlite-pipeline-schema.cjs');
const {pipelineState}=require('./pipelines/infrastructure/pipeline-state.cjs');
const HOME_STRIPS=['latest','pipeline','reminders','notes'];
const TYPES = ['notes', 'tasks', 'reminders', 'boards'];
const text = (value, max = 500) => String(value ?? '').slice(0, max);
const iso = value => value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
class Store {
  constructor(directory, { now = Date.now } = {}) {
    this.now = now;
    this.directory = directory;
    this.file = path.join(directory, 'notebook.sqlite');
    this.error = null;
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(this.file);
    fs.chmodSync(this.file, 0o600);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = FULL;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('notes','tasks','reminders','boards')),
        title TEXT NOT NULL DEFAULT '',
        body TEXT NOT NULL DEFAULT '',
        created TEXT NOT NULL,
        updated TEXT NOT NULL,
        trashed INTEGER NOT NULL DEFAULT 0,
        scheduled_at TEXT,
        reminder_enabled INTEGER NOT NULL DEFAULT 0,
        fired INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS daily_pages (day TEXT PRIMARY KEY, body TEXT NOT NULL DEFAULT '', overview TEXT NOT NULL, created TEXT NOT NULL, updated TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS media_blobs (id TEXT PRIMARY KEY, file TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS cuts (
        id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
        kind TEXT NOT NULL CHECK(kind IN ('image','link','pdf')), blob_id TEXT REFERENCES media_blobs(id),
        url TEXT NOT NULL DEFAULT '', title TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'ready', side TEXT NOT NULL DEFAULT 'right', anchor INTEGER NOT NULL DEFAULT 0,
        width REAL NOT NULL DEFAULT 0.5, trashed INTEGER NOT NULL DEFAULT 0, created TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS notes_type_trash ON notes(type, trashed);
      CREATE INDEX IF NOT EXISTS reminders_due ON notes(reminder_enabled, trashed, fired, scheduled_at);
    `);
    if(!this.db.prepare('PRAGMA table_info(notes)').all().some(column=>column.name==='editor_document')) this.db.exec('ALTER TABLE notes ADD COLUMN editor_document TEXT');
    // Rebuild the legacy CHECK constraint without changing existing columns or references.
    const cutsSchema = this.db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='cuts'").get().sql;
    if (!cutsSchema.includes("'pdf'")) {
      this.db.exec('PRAGMA foreign_keys = OFF');
      try {
        this.transaction(() => {
          this.db.exec(cutsSchema.replace(/CREATE TABLE "?cuts"?/i, 'CREATE TABLE cuts_pdf_migration').replace("'image','link'", "'image','link','pdf'"));
          this.db.exec('INSERT INTO cuts_pdf_migration SELECT * FROM cuts; DROP TABLE cuts; ALTER TABLE cuts_pdf_migration RENAME TO cuts');
        });
      } finally { this.db.exec('PRAGMA foreign_keys = ON'); }
    }
    installTemporal(this);
    installCategories(this);
    installNotebooks(this);
    installSourceActions(this);
    installBoards(this);
    installPipelines(this);
    if (!this.getSetting('initialized')) this.initialize();
    if (!this.getSetting('categories_initialized')) this.transaction(()=>{ const stamp=new Date(this.now()).toISOString(); for(const note of this.db.prepare('SELECT id FROM notes').all()) syncCategories(this,note.id,stamp); this.setSetting('categories_initialized','1'); });
  }
  getSetting(key) { return this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value; }
  setSetting(key, value) { const stamp=new Date(this.now()).toISOString(); this.db.prepare('INSERT INTO settings(key,value,created_at,updated_at) VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at WHERE settings.value<>excluded.value').run(key, String(value),stamp,stamp); }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  insert(note) {
    this.db.prepare(`INSERT INTO notes(id,type,title,body,created,updated,trashed,scheduled_at,reminder_enabled,fired,notebook_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
      note.id, note.type, text(note.title, 160), text(note.body, 200_000), note.created, note.updated,
      Number(Boolean(note.trashed)), iso(note.scheduledAt), Number(Boolean(note.enabled)), Number(Boolean(note.fired)), getNotebook(this,note.notebookId || activeNotebook(this)).id
    );
    event(this,'note',note.id,'create',note.created);
  }
  initialize() {
    const stamp = new Date(this.now()).toISOString();
    const legacyFile = path.join(this.directory, 'notebook.json');
    let legacy;
    if (fs.existsSync(legacyFile)) {
      // Keep both the original JSON and an explicit backup before importing.
      const backup = path.join(this.directory, `notebook-before-sqlite-${this.now()}.json`);
      fs.copyFileSync(legacyFile, backup);
      try {
        legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf8'));
        if (legacy.version !== 1 || !Array.isArray(legacy.notes)) throw new Error('Formato desconhecido.');
      } catch (error) {
        this.db.close();
        throw new Error(`Não foi possível importar os dados anteriores. O JSON e o backup foram preservados: ${error.message}`);
      }
    }
    this.transaction(() => {
      if (legacy) {
        for (const note of legacy.notes) {
          this.insert({ id: note.id, type: 'notes', title: note.title, body: note.body, created: iso(note.created) || stamp, updated: iso(note.updated) || stamp, trashed: note.archived });
        }
        for (const reminder of legacy.reminders || []) {
          this.insert({ id: randomUUID(), type: 'reminders', title: reminder.title, body: reminder.body || '', scheduledAt: reminder.due, enabled: !reminder.fired, fired: reminder.fired, created: stamp, updated: stamp });
        }
        this.setSetting('selected:notes', legacy.selected || '');
        this.setSetting('legacy_imported', stamp);
      } else {
        this.insert({ id: 'welcome', type: 'notes', title: 'Ideias de hoje', body: 'Uma página em branco, um mundo de possibilidades.\n\nEscreva aqui o que você quer lembrar.\nUma ideia, um plano, uma pequena descoberta…\n\nEste cantinho é seu.', created: stamp, updated: stamp });
        this.setSetting('selected:notes', 'welcome');
      }
      this.setSetting('active_view', 'home');
      this.setSetting('initialized', '2');
    });
  }
  dto(row) {
    return { id: row.id, notebookId:row.notebook_id, editorDoc:row.editor_document?JSON.parse(row.editor_document):null, type: row.type, title: row.title, body: row.body, created: row.created, updated: row.updated, trashed: Boolean(row.trashed), deletedAt:row.deleted_at, scheduledAt: row.scheduled_at, enabled: Boolean(row.reminder_enabled), fired: Boolean(row.fired), firedAt:row.fired_at };
  }
  dayKey(time = this.now()) {
    const date = new Date(time);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  ensureDaily() {
    const day = this.dayKey(), stamp = new Date(this.now()).toISOString();
    const notes = this.db.prepare('SELECT * FROM notes WHERE trashed=0 ORDER BY updated DESC,rowid DESC').all();
    const linked=sourceActions(this);
    const reminders = notes.filter(note => note.scheduled_at && this.dayKey(note.scheduled_at) === day && (note.reminder_enabled || note.fired)).sort((a,b) => a.scheduled_at.localeCompare(b.scheduled_at)).map(note => ({ id: note.id, title: note.title, due: note.scheduled_at, fired: Boolean(note.fired), created:note.created,updated:note.updated,body: note.body.slice(0, 180) }));
    reminders.push(...linked.filter(item=>item.kind==='reminder'&&this.dayKey(item.due)===day).map(item=>({...item,id:item.noteId,sourceActionId:item.id,body:item.origin.quote})));
    reminders.sort((a,b)=>a.due.localeCompare(b.due));
    const recentNotes = notes.filter(note => note.type === 'notes' || note.type === 'boards').slice(0, 4).map(note => ({ id: note.id, title: note.title, body: note.body.replace(/\s+/g, ' ').slice(0, 140), created:note.created,updated: note.updated }));
    const overview = JSON.stringify({ reminders, recentNotes });
    this.db.prepare('INSERT INTO daily_pages(day,overview,created,updated) VALUES(?,?,?,?) ON CONFLICT(day) DO UPDATE SET overview=excluded.overview,updated=excluded.updated WHERE daily_pages.overview<>excluded.overview').run(day, overview, stamp, stamp);
    return day;
  }
  snapshot() {
    const today = this.ensureDaily();
    const notes = this.db.prepare('SELECT * FROM notes ORDER BY created,rowid').all().map(row => this.dto(row));
    const categories=categoryState(this,notes);
    const thumbnails=boardsWithThumbnail(this); for (const note of notes) if (note.type === 'boards') note.hasThumbnail = thumbnails.has(note.id);
    const cuts = this.db.prepare('SELECT * FROM cuts ORDER BY created,rowid').all().map(row => ({ id: row.id, noteId: row.note_id, kind: row.kind, blobId: row.blob_id, url: row.url, title: row.title, description: row.description, status: row.status, side: row.side, anchor: row.anchor, width: row.width, trashed: Boolean(row.trashed), created: row.created, updated:row.updated_at, deletedAt:row.deleted_at }));
    notes.forEach(note => { note.cuts = cuts.filter(cut => cut.noteId === note.id && !cut.trashed); });
    const activeBook=activeNotebook(this);
    const selected = {};
    for (const type of TYPES) {
      const id = this.getSetting('selected:' + type);
      selected[type] = notes.find(note => note.id === id && note.type === type && !note.trashed && note.notebookId===activeBook)?.id || notes.find(note => note.type === type && !note.trashed && note.notebookId===activeBook)?.id || null;
    }
    const { pipelines, trashTasks } = pipelineState(this);
    const homeFolded = Object.fromEntries(HOME_STRIPS.map(strip => [strip, this.getSetting('home_fold_' + strip) === '1']));
    const days = this.db.prepare('SELECT day FROM daily_pages ORDER BY day DESC').all().map(row => row.day);
    const day = days.includes(this.getSetting('selected_day')) ? this.getSetting('selected_day') : today;
    const row = this.db.prepare('SELECT * FROM daily_pages WHERE day=?').get(day);
    const daily = { day, today, body: row.body, created:row.created,updated:row.updated, overview: JSON.parse(row.overview), days };
    return { version: 2, sourceActions:sourceActions(this),trashSourceActions:sourceActions(this,true), notebooks:notebookState(this),activeNotebook:activeBook,notebookColors:COLORS, categories, daily, notes, pipelines, trashTasks, homeFolded, selected, trashCuts: cuts.filter(cut => cut.trashed && notes.some(note => note.id === cut.noteId && !note.trashed)), activeView: this.getSetting('active_view') || 'home', sidebarCollapsed: this.getSetting('sidebar_collapsed') === '1', storagePath: this.file };
  }
  note(id, type) {
    const note = this.db.prepare('SELECT * FROM notes WHERE id=?').get(id);
    if (!note || (type && note.type !== type)) throw new Error('Nota não encontrada.');
    return note;
  }
  cut(id) { const cut = this.db.prepare('SELECT * FROM cuts WHERE id=?').get(id); if (!cut) throw new Error('Recorte não encontrado.'); return cut; }
  select(note) { this.setSetting('active_notebook',note.notebook_id); this.setSetting('selected:' + note.type, note.id); this.setSetting('active_view', note.type); }
  dispatch(action, input = {}) {
    this.ensureDaily();
    const stamp = new Date(this.now()).toISOString();
    this.transaction(() => {
      if(['view:select','note:select','note:create','note:trash','category:finalize','notebook:select','notebook:create'].includes(action)) {
        const activeView=this.getSetting('active_view'), selectedId=this.getSetting('selected:'+activeView);
        if(selectedId&&this.db.prepare('SELECT id FROM notes WHERE id=? AND trashed=0').get(selectedId)) syncCategories(this,selectedId,stamp);
      }
      if(notebookCommand(this,action,input,stamp)) return;
      if(sourceCommand(this,action,input,stamp)) return;
      switch (action) {
        case 'category:finalize': break;
        case 'category:attach': {
          const note=this.note(input.noteId); if(note.trashed) throw new Error('Restaure a página primeiro.');
          const row=input.categoryId ? this.db.prepare('SELECT * FROM categories WHERE id=?').get(input.categoryId) : category(this,input.name,stamp);
          if(!row) throw new Error('Categoria não encontrada.');
          associate(this,note.id,row.id,'manual',stamp);
          this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp,note.id); break;
        }
        case 'category:detach': {
          const note=this.note(input.noteId); if(note.trashed) throw new Error('Restaure a página primeiro.');
          detach(this,note.id,input.categoryId,'manual',stamp);
          this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp,note.id); break;
        }
        case 'day:select': {
          if (!this.db.prepare('SELECT day FROM daily_pages WHERE day=?').get(input.day)) throw new Error('Não há página para esse dia.');
          this.setSetting('selected_day', input.day); this.setSetting('active_view', 'home'); break;
        }
        case 'day:update': {
          if (input.day !== this.dayKey() || typeof input.body !== 'string' || input.body.length > 200_000) throw new Error('Edite apenas a página de hoje, com até 200.000 caracteres.');
          this.db.prepare('UPDATE daily_pages SET body=?,updated=? WHERE day=?').run(input.body, stamp, input.day); break;
        }
        case 'cut:create': {
          const note = this.note(input.noteId, 'notes');
          if (note.trashed) throw new Error('Restaure a nota antes de colar recortes.');
          if (!['image', 'link', 'pdf'].includes(input.kind)) throw new Error('Tipo de recorte inválido.');
          if (this.db.prepare('SELECT count(*) AS total FROM cuts WHERE note_id=?').get(note.id).total >= 100) throw new Error('Limite de 100 recortes por página atingido.');
          if (['image','pdf'].includes(input.kind) && !input.blobId) throw new Error('Arquivo ausente.');
          const id = input.id || randomUUID();
          this.db.prepare('INSERT INTO cuts(id,note_id,kind,blob_id,url,title,description,status,created) VALUES(?,?,?,?,?,?,?,?,?)').run(id, note.id, input.kind, input.blobId || null, text(input.url, 4000), text(input.title, 300), text(input.description, 800), input.status || 'ready', stamp);
          this.db.prepare('UPDATE cuts SET updated_at=? WHERE id=?').run(stamp,id); event(this,'cut',id,'create',stamp);
          this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp, note.id); break;
        }
        case 'cut:layout': {
          const cut = this.cut(input.id), note = this.note(cut.note_id);
          if (note.trashed || cut.trashed) throw new Error('Restaure o recorte antes de mover.');
          const side = input.side ?? cut.side, anchor = input.anchor ?? cut.anchor, width = input.width ?? cut.width;
          if (!['left','right'].includes(side) || !Number.isInteger(anchor) || anchor < 0 || anchor > 10000 || !Number.isFinite(width) || width < .25 || width > .85) throw new Error('Posição do recorte inválida.');
          this.db.prepare('UPDATE cuts SET side=?,anchor=?,width=?,updated_at=? WHERE id=?').run(side, anchor, width, stamp,cut.id); this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp,note.id); break;
        }
        case 'cut:preview': {
          const cut = this.cut(input.id);
          this.db.prepare('UPDATE cuts SET title=?,description=?,blob_id=?,status=?,updated_at=? WHERE id=?').run(text(input.title || cut.title, 300), text(input.description, 800), input.blobId || null, input.status === 'ready' ? 'ready' : 'unavailable', stamp,cut.id); break;
        }
        case 'cut:trash': { this.cut(input.id); this.db.prepare('UPDATE cuts SET trashed=1,deleted_at=?,updated_at=? WHERE id=?').run(stamp,stamp,input.id); event(this,'cut',input.id,'trash',stamp); this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp,this.cut(input.id).note_id); break; }
        case 'cut:restore': { const cut = this.cut(input.id), note = this.note(cut.note_id); if (note.trashed) throw new Error('Restaure a nota primeiro.'); this.db.prepare('UPDATE cuts SET trashed=0,deleted_at=NULL,updated_at=? WHERE id=?').run(stamp,cut.id); event(this,'cut',cut.id,'restore',stamp); this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp,note.id); this.select(note); break; }
        case 'cut:purge': { const cut = this.cut(input.id); if (!cut.trashed) throw new Error('Mova o recorte para a lixeira primeiro.'); event(this,'cut',cut.id,'purge',stamp); this.db.prepare('DELETE FROM cuts WHERE id=?').run(cut.id); break; }
        case 'home:fold': {
          if (!HOME_STRIPS.includes(input.strip) || typeof input.folded !== 'boolean') throw new Error('Faixa inválida.');
          this.setSetting('home_fold_' + input.strip, input.folded ? '1' : '0'); break;
        }
        case 'ui:sidebar': {
          if (typeof input.collapsed !== 'boolean') throw new Error('Estado do menu inválido.');
          this.setSetting('sidebar_collapsed', input.collapsed ? '1' : '0'); break;
        }
        case 'view:select': {
          if (![...TYPES, 'archive', 'home', 'notebooks'].includes(input.view)) throw new Error('Seção inválida.');
          this.setSetting('active_view', input.view); if (input.view === 'home') this.setSetting('selected_day', this.dayKey()); break;
        }
        case 'note:create': {
          const type = input.type || 'notes';
          if (!TYPES.includes(type)) throw new Error('Tipo inválido.');
          const count = this.db.prepare('SELECT count(*) AS total FROM notes').get().total;
          if (count >= 3000) throw new Error('Limite de 3.000 páginas atingido.');
          const note = { id: randomUUID(), type, title: text(input.title || { notes: 'Nova nota', tasks: 'Novo pipeline', reminders: 'Novo lembrete', boards: '' }[type], 160), body: '', notebookId:input.notebookId, created: stamp, updated: stamp };
          this.insert(note); if (type === 'boards') createEmptyBoard(this, note.id, stamp); if (type === 'tasks') createPipelineColumns(this, note.id, stamp);
          this.select(this.note(note.id)); break;
        }
        case 'note:update': {
          const note = this.note(input.id);
          if (note.type === 'boards' && (Object.hasOwn(input,'body') || Object.hasOwn(input,'editorDoc'))) throw new Error('O texto do quadro vem dos elementos do quadro.');
          let doc=Object.hasOwn(input,'editorDoc')?(input.editorDoc===null?null:pageDocument.normalize(input.editorDoc)):note.editor_document?JSON.parse(note.editor_document):null;
          if(Object.hasOwn(input,'editorDoc')&&doc&&note.type!=='notes') throw new Error('Blocos estão disponíveis nas notas.');
          const body=Object.hasOwn(input,'editorDoc')&&doc?pageDocument.text(doc):Object.hasOwn(input,'body')?text(input.body,200000):note.body;
          if(doc&&!Object.hasOwn(input,'editorDoc')) doc=pageDocument.reconcile(doc,body);
          if (note.trashed) throw new Error('Restaure a nota antes de editar.');
          this.db.prepare('UPDATE notes SET title=?,body=?,updated=? WHERE id=?').run(
            Object.hasOwn(input, 'title') ? text(input.title, 160) : note.title,
            body, stamp, note.id
          );
          this.db.prepare('UPDATE notes SET editor_document=? WHERE id=?').run(doc?JSON.stringify(doc):null,note.id);
          if(Object.hasOwn(input,'body')||Object.hasOwn(input,'editorDoc')) syncCategories(this,note.id,stamp,Number.isInteger(input.categoryCursor)?input.categoryCursor:null);
          break;
        }
        case 'note:select': {
          const note = this.note(input.id); if (note.trashed) throw new Error('Esta nota está na lixeira.'); this.select(note); break;
        }
        case 'note:trash': this.note(input.id); this.db.prepare('UPDATE notes SET trashed=1,deleted_at=?,updated=? WHERE id=?').run(stamp,stamp,input.id); event(this,'note',input.id,'trash',stamp); break;
        case 'note:restore': {
          const note = this.note(input.id);
          this.db.prepare('UPDATE notes SET trashed=0,deleted_at=NULL,updated=?,reminder_enabled=? WHERE id=?').run(stamp,Number(Boolean(note.reminder_enabled && (!note.scheduled_at || Date.parse(note.scheduled_at) > this.now()))), note.id);
          this.db.prepare("UPDATE source_actions SET cancelled_at=?,updated_at=? WHERE note_id=? AND kind='reminder' AND fired_at IS NULL AND due<=?").run(stamp,stamp,note.id,stamp);
          event(this,'note',note.id,'restore',stamp); this.select(note); break;
        }
        case 'note:purge': {
          const note = this.note(input.id); if (!note.trashed) throw new Error('Mova a nota para a lixeira primeiro.');
          event(this,'note',note.id,'purge',stamp); this.db.prepare('DELETE FROM notes WHERE id=?').run(note.id); break;
        }
        case 'schedule:draft': {
          const note = this.note(input.id, 'reminders'); if (note.trashed) throw new Error('Restaure o lembrete primeiro.');
          const date = input.due ? iso(input.due) : null;
          if (input.due && !date) throw new Error('Horário inválido.');
          this.db.prepare('UPDATE notes SET scheduled_at=?,reminder_enabled=0,fired=0,fired_at=NULL,updated=? WHERE id=?').run(date, stamp, note.id); break;
        }
        case 'schedule:activate': {
          const note = this.note(input.id);
          if (!['notes', 'reminders'].includes(note.type)) throw new Error('Agende o alerta em uma nota.');
          const due = iso(input.due || note.scheduled_at);
          if (note.trashed || !due || Date.parse(due) <= this.now()) throw new Error('Escolha um dia e horário futuros para o alerta.');
          this.db.prepare('UPDATE notes SET scheduled_at=?,reminder_enabled=1,fired=0,fired_at=NULL,updated=? WHERE id=?').run(due, stamp, note.id); event(this,'note',note.id,'schedule',stamp,{due}); break;
        }
        case 'schedule:cancel': {
          const note = this.note(input.id);
          if (note.trashed || !['notes', 'reminders'].includes(note.type)) throw new Error('Nota inválida para alerta.');
          this.db.prepare('UPDATE notes SET reminder_enabled=0,updated=? WHERE id=?').run(stamp,input.id); event(this,'note',input.id,'cancel-schedule',stamp); break;
        }
        default: throw new Error('Ação inválida.');
      }
    });
    return this.snapshot();
  }
  due() {
    return this.transaction(() => {
      const rows = this.db.prepare("SELECT * FROM notes WHERE type IN ('notes','reminders') AND trashed=0 AND reminder_enabled=1 AND fired=0 AND scheduled_at<=? ORDER BY scheduled_at").all(new Date(this.now()).toISOString());
      for (const row of rows) { const stamp=new Date(this.now()).toISOString(); this.db.prepare('UPDATE notes SET fired=1,reminder_enabled=0,fired_at=?,updated=? WHERE id=?').run(stamp,stamp,row.id); event(this,'note',row.id,'fire',stamp); }
      return [...rows.map(row => this.dto(row)),...dueSourceActions(this,new Date(this.now()).toISOString())];
    });
  }
  flush() { this.db.exec('PRAGMA wal_checkpoint(PASSIVE)'); }
  close() { this.db.close(); }
}
module.exports = { Store };
