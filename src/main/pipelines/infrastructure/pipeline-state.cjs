// Read model for the renderer snapshot: pipelines with columns and cards, plus trashed tasks.
// Descriptions, comments and history load only when a task opens.
function pipelineState(store) {
  const db = store.db;
  const comments = new Map(db.prepare('SELECT task_id, count(*) AS total, group_concat(text, \' \') AS text FROM pipeline_comments GROUP BY task_id').all().map(row => [row.task_id, row]));
  const columns = db.prepare('SELECT id,note_id,name FROM pipeline_columns ORDER BY note_id,position').all();
  const card = (row, finalId) => ({
    id: row.id, pipelineId: row.note_id, columnId: row.column_id, position: row.position, title: row.title, owner: row.owner,
    createdAt: row.created_at, updatedAt: row.updated_at, deletedAt: row.deleted_at, done: row.column_id === finalId,
    commentCount: comments.get(row.id)?.total || 0,
    source: row.source_note_id ? { noteId: row.source_note_id, origin: JSON.parse(row.source_origin) } : null,
    searchText: `${row.description_text} ${comments.get(row.id)?.text || ''}`.replace(/\s+/g, ' ').trim(),
  });
  const tasks = db.prepare('SELECT * FROM pipeline_tasks ORDER BY position,created_at').all();
  const pipelines = db.prepare("SELECT id,title,notebook_id,created,updated,trashed FROM notes WHERE type='tasks' ORDER BY created,rowid").all().map(page => {
    const own = columns.filter(column => column.note_id === page.id), finalId = own.at(-1)?.id;
    const active = tasks.filter(task => task.note_id === page.id && !task.deleted_at).map(task => card(task, finalId));
    return {
      id: page.id, title: page.title, notebookId: page.notebook_id, created: page.created, updated: page.updated, trashed: Boolean(page.trashed),
      columns: own.map(column => ({ id: column.id, name: column.name, final: column.id === finalId })),
      tasks: active, done: active.filter(task => task.done).length, total: active.length,
    };
  });
  const open = new Map(pipelines.filter(pipeline => !pipeline.trashed).map(pipeline => [pipeline.id, pipeline]));
  const trashTasks = tasks.filter(task => task.deleted_at && open.has(task.note_id)).map(task => ({ ...card(task, null), pipelineTitle: open.get(task.note_id).title }));
  return { pipelines, trashTasks };
}

module.exports = { pipelineState };
