// Pipeline tables, default columns for new pipeline pages and the one-time move away from task lists.
const { randomUUID } = require('node:crypto');
const pageDocument = require('../../../shared/editor-document.js');
const { createDefaultColumns } = require('../domain/columns.cjs');

const CHECKBOX = /^\s*(?:-\s*)?\[([ xX]?)\][ \t]?/;

function createTables(store) {
  store.db.exec(`CREATE TABLE IF NOT EXISTS pipeline_columns(id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, name TEXT NOT NULL, position INTEGER NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pipeline_tasks(id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, column_id TEXT REFERENCES pipeline_columns(id) ON DELETE SET NULL, position INTEGER NOT NULL, title TEXT NOT NULL, owner TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '[]', description_text TEXT NOT NULL DEFAULT '', source_note_id TEXT REFERENCES notes(id) ON DELETE SET NULL, source_origin TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, deleted_at TEXT);
    CREATE TABLE IF NOT EXISTS pipeline_comments(id TEXT PRIMARY KEY, task_id TEXT NOT NULL REFERENCES pipeline_tasks(id) ON DELETE CASCADE, document TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, edited_at TEXT);
    CREATE TABLE IF NOT EXISTS pipeline_movements(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT NOT NULL REFERENCES pipeline_tasks(id) ON DELETE CASCADE, kind TEXT NOT NULL CHECK(kind IN ('create','column','reorder','restore')), from_column TEXT, to_column TEXT NOT NULL, from_position INTEGER, to_position INTEGER NOT NULL, at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pipeline_images(id TEXT PRIMARY KEY, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, task_id TEXT NOT NULL REFERENCES pipeline_tasks(id) ON DELETE CASCADE, number INTEGER NOT NULL, file TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL, created_at TEXT NOT NULL, UNIQUE(note_id, number));
    CREATE INDEX IF NOT EXISTS pipeline_columns_note ON pipeline_columns(note_id, position);
    CREATE INDEX IF NOT EXISTS pipeline_tasks_note ON pipeline_tasks(note_id, column_id, position);
    CREATE INDEX IF NOT EXISTS pipeline_tasks_source ON pipeline_tasks(source_note_id);
    CREATE INDEX IF NOT EXISTS pipeline_comments_task ON pipeline_comments(task_id, created_at);
    CREATE INDEX IF NOT EXISTS pipeline_movements_task ON pipeline_movements(task_id, id);
    CREATE INDEX IF NOT EXISTS pipeline_images_task ON pipeline_images(task_id);`);
}

// Runs inside the note:create transaction, so a pipeline page never exists without its columns.
function createPipelineColumns(store, noteId, stamp) {
  const insert = store.db.prepare('INSERT INTO pipeline_columns(id,note_id,name,position,created_at,updated_at) VALUES(?,?,?,?,?,?)');
  createDefaultColumns(randomUUID).forEach((column, position) => insert.run(column.id, noteId, column.name, position, stamp, stamp));
}

// Checkbox lines become plain text: the marker goes, the text and its formatting stay.
function plainCheckboxes(store) {
  for (const note of store.db.prepare("SELECT id,body,editor_document FROM notes WHERE type='notes'").all()) {
    let body = note.body, doc = null;
    if (note.editor_document) {
      doc = JSON.parse(note.editor_document).map(block => (block.type === 'check' ? { id: block.id, type: 'paragraph', runs: block.runs || [] } : block));
      body = pageDocument.text(doc);
    } else {
      let code = false;
      body = note.body.split('\n').map(line => { if (/^```/.test(line)) code = !code; return code ? line : line.replace(CHECKBOX, ''); }).join('\n');
    }
    if (body !== note.body || doc) store.db.prepare('UPDATE notes SET body=?,editor_document=? WHERE id=?').run(body, doc ? JSON.stringify(doc) : null, note.id);
  }
}

function migrateFromTaskLists(store, stamp) {
  store.transaction(() => {
    store.db.exec("DELETE FROM source_actions WHERE kind='task'; DROP TABLE IF EXISTS task_items; DROP TABLE IF EXISTS inline_tasks;");
    plainCheckboxes(store);
    for (const page of store.db.prepare("SELECT n.id FROM notes n WHERE n.type='tasks' AND NOT EXISTS (SELECT 1 FROM pipeline_columns c WHERE c.note_id=n.id)").all()) createPipelineColumns(store, page.id, stamp);
    store.setSetting('pipelines_migrated', '1');
  });
}

function installPipelines(store) {
  createTables(store);
  if (!store.getSetting('pipelines_migrated')) migrateFromTaskLists(store, new Date(store.now()).toISOString());
}

module.exports = { installPipelines, createPipelineColumns };
