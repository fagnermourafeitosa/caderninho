const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { Store } = require('../src/main/store.cjs');
function fixture(t, legacy) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'caderninho-sqlite-test-'));
  let clock = new Date('2026-10-01T15:00:00Z').getTime();
  if (legacy) fs.writeFileSync(path.join(directory, 'notebook.json'), JSON.stringify(legacy));
  const opened = [];
  const open = () => { const store = new Store(directory, { now: () => clock }); opened.push(store); return store; };
  const store = open();
  t.after(() => { opened.reverse().forEach(s => s.close()); fs.rmSync(directory, { recursive: true, force: true }); });
  return { directory, store, open, advance: delta => clock += delta, now: () => clock };
}
function create(store, type, title) { store.dispatch('note:create', { type, title }); return store.snapshot().selected[type]; }
const note = (store, id) => store.snapshot().notes.find(n => n.id === id);
test('sidebar preference persists independently of pages after reopening', t => {
  const { store, open } = fixture(t);
  const before = store.snapshot().notes;
  assert.equal(store.snapshot().sidebarCollapsed, false);
  store.dispatch('ui:sidebar', { collapsed: true });
  assert.equal(open().snapshot().sidebarCollapsed, true);
  assert.deepEqual(store.snapshot().notes, before);
  assert.throws(() => store.dispatch('ui:sidebar', { collapsed: 'yes' }));
  store.dispatch('ui:sidebar', { collapsed: false });
  assert.equal(open().snapshot().sidebarCollapsed, false);
});
test('SQLite commits edits immediately and preserves text after reopening', t => {
  const { store, open } = fixture(t);
  const id = create(store, 'notes', 'Título');
  const body = 'Primeira linha\nSegunda linha 🍅\n<script>apenas texto</script>';
  store.dispatch('note:update', { id, title: 'Minhas ideias', body });
  const reopened = open();
  assert.equal(note(reopened, id).body, body);
  assert.equal(reopened.snapshot().selected.notes, id);
  assert.equal(fs.readFileSync(store.file).subarray(0, 16).toString(), 'SQLite format 3\u0000');
  assert.equal(store.db.prepare('PRAGMA integrity_check').get().integrity_check, 'ok');
});
test('multiple checklist pages have independent editable checkbox items', t => {
  const { store, open, advance, now } = fixture(t);
  const first = create(store, 'tasks', 'Trabalho');
  const created = new Date(now()).toISOString();
  advance(60_000);
  store.dispatch('item:create', { noteId: first, title: 'Escrever' });
  store.dispatch('item:create', { noteId: first, title: 'Revisar' });
  const second = create(store, 'tasks', 'Casa');
  store.dispatch('item:create', { noteId: second, title: 'Fazer café' });
  const id = note(store, first).items[0].id;
  store.dispatch('item:toggle', { id });
  store.dispatch('item:update', { id, title: 'Escrever o rascunho' });
  const reopened = open();
  assert.equal(note(reopened, first).title, 'Trabalho');
  assert.equal(note(reopened, first).created, created);
  assert.equal(note(reopened, first).updated, new Date(now()).toISOString());
  assert.equal(note(reopened, first).items[1].done, false);
  assert.equal(note(reopened, second).title, 'Casa');
  assert.equal(note(reopened, first).items.length, 2);
  assert.equal(note(reopened, first).items[0].done, true);
  assert.equal(note(reopened, first).items[0].title, 'Escrever o rascunho');
  assert.equal(note(reopened, second).items.length, 1);
  assert.equal(note(reopened, second).items[0].done, false);
});
test('trash preserves page types, text, and checkbox states when restoring', t => {
  const { store } = fixture(t);
  for (const type of ['notes', 'tasks', 'reminders']) {
    const id = create(store, type, type);
    store.dispatch('note:update', { id, body: 'Conteúdo preservado' });
    if (type === 'tasks') { store.dispatch('item:create', { noteId: id, title: 'Concluída' }); store.dispatch('item:toggle', { id: note(store, id).items[0].id }); }
    store.dispatch('note:trash', { id });
    assert.equal(note(store, id).trashed, true);
    assert.throws(() => store.dispatch('note:select', { id }));
    store.dispatch('note:restore', { id });
    assert.equal(note(store, id).type, type);
    assert.equal(note(store, id).body, 'Conteúdo preservado');
    assert.equal(store.snapshot().activeView, type);
    if (type === 'tasks') assert.equal(note(store, id).items[0].done, true);
  }
});
test('individual checkboxes go to task trash and can be restored', t => {
  const { store } = fixture(t);
  const id = create(store, 'tasks');
  store.dispatch('item:create', { noteId: id, title: 'Uma tarefa' });
  const item = note(store, id).items[0];
  store.dispatch('item:toggle', { id: item.id });
  store.dispatch('item:trash', { id: item.id });
  assert.equal(note(store, id).items.length, 0);
  assert.equal(store.snapshot().trashItems[0].done, true);
  store.dispatch('item:restore', { id: item.id });
  assert.equal(store.snapshot().trashItems.length, 0);
  assert.equal(note(store, id).items[0].done, true);
});
test('reminder notes preserve content and fire once after a delayed wakeup', t => {
  const { store, open, advance, now } = fixture(t);
  const id = create(store, 'reminders', 'Alongar');
  store.dispatch('note:update', { id, body: 'Levantar e caminhar um pouco.' });
  store.dispatch('schedule:activate', { id, due: new Date(now() + 30_000).toISOString() });
  assert.deepEqual(store.due(), []);
  advance(2 * 60 * 60_000);
  assert.equal(store.due()[0].body, 'Levantar e caminhar um pouco.');
  assert.deepEqual(store.due(), []);
  assert.deepEqual(open().due(), []);
  assert.equal(note(store, id).fired, true);
});
test('trashed reminders do not fire and restoring an expired one requires rescheduling', t => {
  const { store, advance, now } = fixture(t);
  const id = create(store, 'reminders');
  store.dispatch('schedule:activate', { id, due: new Date(now() + 60_000).toISOString() });
  store.dispatch('note:trash', { id });
  advance(120_000);
  assert.deepEqual(store.due(), []);
  store.dispatch('note:restore', { id });
  assert.equal(note(store, id).enabled, false);
  assert.deepEqual(store.due(), []);
  store.dispatch('schedule:activate', { id, due: new Date(now() + 60_000).toISOString() });
  advance(60_000); assert.equal(store.due().length, 1);
});
test('editing the reminder date stores a draft and disarms the old alarm', t => {
  const { store, now, open } = fixture(t);
  const id = create(store, 'reminders');
  assert.throws(() => store.dispatch('schedule:activate', { id, due: 'invalid' }));
  assert.throws(() => store.dispatch('schedule:activate', { id, due: new Date(now() - 1).toISOString() }));
  const due = new Date(now() + 90_000).toISOString();
  store.dispatch('schedule:activate', { id, due });
  store.dispatch('schedule:draft', { id, due });
  assert.equal(note(open(), id).scheduledAt, due);
  assert.equal(note(store, id).enabled, false);
  store.dispatch('schedule:activate', { id });
  assert.equal(note(store, id).enabled, true);
  store.dispatch('schedule:cancel', { id });
  assert.equal(note(store, id).enabled, false);
});
test('legacy JSON is backed up and imported exactly once', t => {
  const legacy = { version: 1, theme: 'night', pin: true, selected: 'kept', notes: [
    { id: 'kept', title: 'Minha nota', body: 'Uma\nDuas', created: '2026-09-01T12:00:00Z', updated: '2026-09-02T12:00:00Z', archived: false },
    { id: 'old', title: 'Antiga', body: 'Ainda aqui', archived: true }
  ], tasks: [{ id: 'checkbox', title: 'Feita', done: true }], reminders: [{ id: 'alarm', title: 'Água', due: '2026-10-02T12:00:00Z', fired: false }] };
  const { store, directory, open } = fixture(t, legacy);
  const state = store.snapshot();
  assert.equal(state.notes.length, 4);
  assert.equal(state.selected.notes, 'kept');
  assert.equal(note(store, 'kept').body, legacy.notes[0].body);
  assert.equal(note(store, 'old').trashed, true);
  assert.equal(state.notes.find(n => n.type === 'tasks').items[0].done, true);
  assert.equal(state.notes.find(n => n.type === 'reminders').enabled, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, 'notebook.json'), 'utf8')), legacy);
  const backups = fs.readdirSync(directory).filter(name => name.startsWith('notebook-before-sqlite-'));
  assert.equal(backups.length, 1);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(directory, backups[0]), 'utf8')), legacy);
  assert.equal(open().snapshot().notes.length, 4);
  assert.equal(fs.readdirSync(directory).filter(name => name.startsWith('notebook-before-sqlite-')).length, 1);
});
test('purge only removes trashed data and cascades checklist items', t => {
  const { store } = fixture(t);
  const id = create(store, 'tasks');
  store.dispatch('item:create', { noteId: id, title: 'Filha' });
  assert.throws(() => store.dispatch('note:purge', { id }));
  store.dispatch('note:trash', { id }); store.dispatch('note:purge', { id });
  assert.equal(note(store, id), undefined);
  assert.equal(store.db.prepare('SELECT count(*) AS n FROM task_items WHERE note_id=?').get(id).n, 0);
});
test('invalid commands roll back and view selection persists', t => {
  const { store, open } = fixture(t);
  const before = store.snapshot();
  assert.throws(() => store.dispatch('note:create', { type: 'other' }));
  assert.throws(() => store.dispatch('theme', { theme: 'night' }));
  assert.deepEqual(store.snapshot(), before);
  store.dispatch('view:select', { view: 'archive' });
  assert.equal(open().snapshot().activeView, 'archive');
});
test('cuts retain layout and references across reopen and typed trash restores', t => {
  const { store, open } = fixture(t), id = create(store, 'notes', 'Recortes');
  const blob = 'a'.repeat(64);
  store.db.prepare('INSERT INTO media_blobs(id,file,mime,bytes) VALUES(?,?,?,?)').run(blob, blob + '.png', 'image/png', 5);
  store.dispatch('note:update', { id, body: 'Texto ao redor' });
  store.dispatch('cut:create', { id: 'cut-image', noteId: id, kind: 'image', blobId: blob });
  store.dispatch('cut:layout', { id: 'cut-image', side: 'left', anchor: 3, width: .4 });
  const cut = note(open(), id).cuts[0];
  assert.equal(cut.side, 'left'); assert.equal(cut.anchor, 3); assert.equal(cut.blobId, blob);
  assert.equal(note(store, id).body, 'Texto ao redor');
  assert.throws(() => store.dispatch('cut:layout', { id: cut.id, width: 10 }));
  store.dispatch('cut:trash', { id: cut.id });
  assert.equal(store.snapshot().trashCuts.length, 1);
  store.dispatch('note:trash', { id }); assert.equal(store.snapshot().trashCuts.length, 0);
  assert.throws(() => store.dispatch('cut:restore', { id: cut.id }));
  store.dispatch('note:restore', { id }); store.dispatch('cut:restore', { id: cut.id });
  assert.equal(note(store, id).cuts[0].width, .4);
  assert.throws(() => store.dispatch('cut:purge', { id: cut.id }));
  store.dispatch('cut:trash', { id: cut.id }); store.dispatch('cut:purge', { id: cut.id });
  assert.equal(note(store, id).cuts.length, 0);
});
test('inline note alarm and checkbox states persist, fire once and respect trash', t => {
  const { store, open, advance, now } = fixture(t), id = create(store, 'notes', 'Margem');
  const body = '[] comprar pão\n[x] café\namanhã às 14h';
  store.dispatch('note:update', { id, body });
  store.dispatch('schedule:activate', { id, due: new Date(now() + 60000).toISOString() });
  const restored = note(open(), id); assert.equal(restored.body, body); assert.equal(restored.type, 'notes'); assert.equal(restored.enabled, true);
  advance(60001); assert.equal(store.due()[0].id, id); assert.equal(store.due().length, 0);
  store.dispatch('schedule:activate', { id, due: new Date(now() + 60000).toISOString() });
  store.dispatch('schedule:cancel', { id }); advance(60001); assert.equal(store.due().length, 0);
  store.dispatch('schedule:activate', { id, due: new Date(now() + 60000).toISOString() });
  store.dispatch('note:trash', { id }); advance(60001); assert.equal(store.due().length, 0);
  store.dispatch('note:restore', { id }); assert.equal(note(store, id).enabled, false); assert.equal(note(store, id).body, body);
  const task = create(store, 'tasks', 'Lista'); assert.throws(() => store.dispatch('schedule:activate', { id: task, due: new Date(now() + 60000).toISOString() }));
});
test('daily pages freeze past overview and retain independent annotations across midnight', t => {
  const { store, advance, open } = fixture(t);
  const list = create(store,'tasks','Trabalho'); store.dispatch('item:create',{noteId:list,title:'Revisar'});
  const task = note(store,list).items[0];
  const originalDay=store.dayKey(); store.dispatch('day:update',{day:originalDay,body:'Foi um bom dia.'});
  store.dispatch('item:toggle',{id:task.id});
  const frozen=store.snapshot().daily.overview;
  assert.equal(frozen.tasks[0].done,true);
  advance(24*60*60*1000);
  store.dispatch('item:toggle',{id:task.id}); store.dispatch('item:update',{id:task.id,title:'Título novo'});
  const nextDay=store.dayKey(); store.dispatch('day:update',{day:nextDay,body:'Novos planos.'});
  store.dispatch('day:select',{day:originalDay});
  const previous=open().snapshot().daily;
  assert.equal(previous.body,'Foi um bom dia.'); assert.deepEqual(previous.overview,frozen);
  assert.throws(()=>store.dispatch('day:update',{day:originalDay,body:'Não mudar o passado'}));
  store.dispatch('day:select',{day:nextDay}); assert.equal(store.snapshot().daily.body,'Novos planos.');
});
test('entity timestamps, toggle history and restored deleted_at survive reopening', t => {
  const { store, advance, open, now }=fixture(t), list=create(store,'tasks','Datas');
  store.dispatch('item:create',{noteId:list,title:'Primeiro item'}); const id=note(store,list).items[0].id;
  const created=note(store,list).items[0].created; assert.equal(created,new Date(now()).toISOString());
  advance(1000); store.dispatch('item:toggle',{id}); const checked=note(store,list).items[0].checkedAt;
  advance(1000); store.dispatch('item:toggle',{id}); const unchecked=note(store,list).items[0].uncheckedAt;
  assert.notEqual(checked,unchecked); assert.equal(note(store,list).items[0].checkedAt,checked);
  assert.deepEqual(store.db.prepare("SELECT action FROM activity_events WHERE entity_type='task' AND entity_id=? ORDER BY id").all(id).map(row=>row.action),['create','check','uncheck']);
  store.dispatch('item:trash',{id}); assert.ok(store.snapshot().trashItems.find(item=>item.id===id).deletedAt);
  advance(1000); store.dispatch('item:restore',{id}); const item=note(open(),list).items[0];
  assert.equal(item.deletedAt,null); assert.equal(item.created,created); assert.equal(item.uncheckedAt,unchecked);
  store.dispatch('note:trash',{id:list}); assert.ok(note(store,list).deletedAt);
  store.dispatch('note:restore',{id:list}); assert.equal(note(open(),list).deletedAt,null);
});
test('inline tasks keep identity and dates while edited, moved, removed and restored', t => {
  const { store,advance,open }=fixture(t), id=create(store,'notes','Inline');
  store.dispatch('note:update',{id,body:'[] Comprar café\n[] Ler'});
  const first=note(store,id).inlineTasks[0]; assert.ok(first.created);
  advance(1000); store.dispatch('inline:toggle',{id:first.id}); assert.ok(note(store,id).body.startsWith('[x]'));
  const checked=note(store,id).inlineTasks[0].checkedAt;
  advance(1000); store.dispatch('note:update',{id,body:'[] Ler\n[x] Comprar café'});
  const moved=note(store,id).inlineTasks.find(item=>item.id===first.id); assert.equal(moved.lineIndex,1); assert.equal(moved.checkedAt,checked);
  advance(1000); store.dispatch('inline:toggle',{id:first.id}); const unchecked=note(store,id).inlineTasks.find(item=>item.id===first.id).uncheckedAt; assert.ok(unchecked);
  store.dispatch('note:update',{id,body:'[] Ler'}); assert.ok(store.db.prepare('SELECT deleted_at FROM inline_tasks WHERE id=?').get(first.id).deleted_at);
  advance(1000); store.dispatch('note:update',{id,body:'[] Ler\n[] Comprar café'});
  const restored=note(open(),id).inlineTasks.find(item=>item.id===first.id); assert.equal(restored.deletedAt,null); assert.equal(restored.created,first.created);
  assert.ok(store.snapshot().daily.overview.tasks.some(item=>item.id===first.id && item.source==='inline'));
});

test('removing quick capture preserves legacy saved data without accepting draft commands', t => {
  const {store,open}=fixture(t);
  const legacy=JSON.stringify({title:'Uma ideia antiga',body:'Texto preservado',notebookId:store.snapshot().activeNotebook});
  store.setSetting('quick_draft',legacy);
  const reopened=open();
  assert.equal(reopened.getSetting('quick_draft'),legacy);
  assert.throws(()=>reopened.dispatch('draft:update',{body:'Outro texto'}));
  assert.throws(()=>reopened.dispatch('draft:commit'));
  assert.equal(reopened.getSetting('quick_draft'),legacy);
});
