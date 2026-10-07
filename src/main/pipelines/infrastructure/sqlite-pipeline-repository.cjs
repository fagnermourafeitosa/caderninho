// SQLite persistence for pipelines (implements PipelineRepositoryPort).
const pageDocument = require('../../../shared/editor-document.js');

const cardRow = row => ({ id: row.id, columnId: row.column_id, position: row.position });

class SqlitePipelineRepository {
  constructor(store) { this.store = store; this.db = store.db; }
  transaction(work) { return this.store.transaction(work); }
  now() { return new Date(this.store.now()).toISOString(); }

  pipeline(pipelineId) {
    const row = this.db.prepare("SELECT id,trashed FROM notes WHERE id=? AND type='tasks'").get(pipelineId);
    return row ? { id: row.id, trashed: Boolean(row.trashed) } : null;
  }
  touch(pipelineId, stamp) { this.db.prepare('UPDATE notes SET updated=? WHERE id=?').run(stamp, pipelineId); }

  columns(pipelineId) { return this.db.prepare('SELECT id,name FROM pipeline_columns WHERE note_id=? ORDER BY position').all(pipelineId).map(row => ({ id: row.id, name: row.name })); }
  column(columnId) {
    const row = this.db.prepare('SELECT id,note_id,name FROM pipeline_columns WHERE id=?').get(columnId);
    return row ? { id: row.id, pipelineId: row.note_id, name: row.name } : null;
  }
  // Writes the whole ordered list: names, positions, new columns and removed ones.
  saveColumns(pipelineId, columns, stamp) {
    const kept = new Set(columns.map(column => column.id));
    for (const row of this.db.prepare('SELECT id FROM pipeline_columns WHERE note_id=?').all(pipelineId)) if (!kept.has(row.id)) this.db.prepare('DELETE FROM pipeline_columns WHERE id=?').run(row.id);
    const upsert = this.db.prepare('INSERT INTO pipeline_columns(id,note_id,name,position,created_at,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,position=excluded.position,updated_at=excluded.updated_at WHERE name<>excluded.name OR position<>excluded.position');
    columns.forEach((column, position) => upsert.run(column.id, pipelineId, column.name, position, stamp, stamp));
  }

  // Active cards of the board; trashed tasks are out of the ordering.
  cards(pipelineId) { return this.db.prepare('SELECT id,column_id,position FROM pipeline_tasks WHERE note_id=? AND deleted_at IS NULL').all(pipelineId).map(cardRow); }
  saveCards(before, after, stamp) {
    const previous = new Map(before.map(card => [card.id, card]));
    const update = this.db.prepare('UPDATE pipeline_tasks SET column_id=?,position=?,updated_at=? WHERE id=?');
    for (const card of after) {
      const old = previous.get(card.id);
      if (!old || old.columnId !== card.columnId || old.position !== card.position) update.run(card.columnId, card.position, stamp, card.id);
    }
  }

  task(taskId) {
    const row = this.db.prepare('SELECT * FROM pipeline_tasks WHERE id=?').get(taskId);
    if (!row) return null;
    return { id: row.id, pipelineId: row.note_id, columnId: row.column_id, position: row.position, title: row.title, owner: row.owner, description: JSON.parse(row.description), createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at, source: row.source_note_id ? { noteId: row.source_note_id, origin: JSON.parse(row.source_origin) } : null };
  }
  insertTask(task, stamp) {
    this.db.prepare('INSERT INTO pipeline_tasks(id,note_id,column_id,position,title,owner,description,description_text,source_note_id,source_origin,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run(
      task.id, task.pipelineId, task.columnId, -1, task.title, task.owner, JSON.stringify(task.description), pageDocument.text(task.description),
      task.source?.noteId ?? null, task.source ? JSON.stringify(task.source.origin) : null, stamp, stamp);
  }
  updateTask(taskId, { title, owner, description }, stamp) {
    const task = this.task(taskId);
    const next = { title: title ?? task.title, owner: owner ?? task.owner, description: description ?? task.description };
    this.db.prepare('UPDATE pipeline_tasks SET title=?,owner=?,description=?,description_text=?,updated_at=? WHERE id=?').run(next.title, next.owner, JSON.stringify(next.description), pageDocument.text(next.description), stamp, taskId);
  }
  setDeleted(taskId, deletedAt, stamp) { this.db.prepare('UPDATE pipeline_tasks SET deleted_at=?,updated_at=? WHERE id=?').run(deletedAt, stamp, taskId); }
  deleteTask(taskId) { this.db.prepare('DELETE FROM pipeline_tasks WHERE id=?').run(taskId); }

  addMovement(taskId, { kind, from, to, fromPosition, toPosition }, stamp) {
    this.db.prepare('INSERT INTO pipeline_movements(task_id,kind,from_column,to_column,from_position,to_position,at) VALUES(?,?,?,?,?,?,?)').run(taskId, kind, from, to, fromPosition, toPosition, stamp);
  }
  movements(taskId) { return this.db.prepare('SELECT * FROM pipeline_movements WHERE task_id=? ORDER BY id').all(taskId).map(row => ({ kind: row.kind, from: row.from_column, to: row.to_column, fromPosition: row.from_position, toPosition: row.to_position, at: row.at })); }

  comment(commentId) {
    const row = this.db.prepare('SELECT * FROM pipeline_comments WHERE id=?').get(commentId);
    return row ? { id: row.id, taskId: row.task_id, document: JSON.parse(row.document), text: row.text, createdAt: row.created_at, updatedAt: row.updated_at, editedAt: row.edited_at } : null;
  }
  comments(taskId) { return this.db.prepare('SELECT id FROM pipeline_comments WHERE task_id=? ORDER BY created_at,rowid').all(taskId).map(row => this.comment(row.id)); }
  insertComment({ id, taskId, document }, stamp) { this.db.prepare('INSERT INTO pipeline_comments(id,task_id,document,text,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id, taskId, JSON.stringify(document), pageDocument.text(document), stamp, stamp); }
  updateComment(commentId, document, stamp) { this.db.prepare('UPDATE pipeline_comments SET document=?,text=?,updated_at=?,edited_at=? WHERE id=?').run(JSON.stringify(document), pageDocument.text(document), stamp, stamp, commentId); }
  deleteComment(commentId) { this.db.prepare('DELETE FROM pipeline_comments WHERE id=?').run(commentId); }

  nextImageNumber(pipelineId) { return this.db.prepare('SELECT coalesce(max(number),0)+1 AS next FROM pipeline_images WHERE note_id=?').get(pipelineId).next; }
  insertImage(image, stamp) { this.db.prepare('INSERT INTO pipeline_images(id,note_id,task_id,number,file,mime,bytes,created_at) VALUES(?,?,?,?,?,?,?,?)').run(image.id, image.pipelineId, image.taskId, image.number, image.file, image.mime, image.bytes, stamp); }
  image(imageId) {
    const row = this.db.prepare('SELECT * FROM pipeline_images WHERE id=?').get(imageId);
    return row ? { id: row.id, pipelineId: row.note_id, taskId: row.task_id, file: row.file, mime: row.mime } : null;
  }
  images(taskId) { return this.db.prepare('SELECT id,file FROM pipeline_images WHERE task_id=? ORDER BY number').all(taskId).map(row => ({ id: row.id, file: row.file })); }
  allImages() { return this.db.prepare('SELECT id,note_id,task_id,file FROM pipeline_images').all().map(row => ({ id: row.id, pipelineId: row.note_id, taskId: row.task_id, file: row.file })); }
  deleteImage(imageId) { this.db.prepare('DELETE FROM pipeline_images WHERE id=?').run(imageId); }
  pipelineIds() { return this.db.prepare("SELECT id FROM notes WHERE type='tasks'").all().map(row => row.id); }
}

module.exports = { SqlitePipelineRepository };
