// Pipeline IPC: validate the untrusted payload, run one use case, answer with its result or the new snapshot.
const { IMAGE_ERROR } = require('../domain/task-image.cjs');
const COLUMN_ERROR = 'Coluna inválida.';
const TASK_ERROR = 'Tarefa inválida.';
const TASK_MISSING = 'Tarefa não encontrada.';
const COMMENT_ERROR = 'Comentário inválido.';
const ID = /^[A-Za-z0-9_-]{1,128}$/;

const fail = message => { throw new Error(message); };
const object = (value, message) => (value && typeof value === 'object' && !Array.isArray(value) ? value : fail(message));
const id = (value, message) => (typeof value === 'string' && ID.test(value) ? value : fail(message));
const string = (value, message) => (typeof value === 'string' ? value : fail(message));
const optional = (value, check, message) => (value === undefined ? undefined : check(value, message));
const position = (value, message) => (Number.isInteger(value) && value >= 0 ? value : fail(message));
const documentArray = (value, message) => (Array.isArray(value) ? value : fail(message));
// Only the fields a use case reads go through; undefined fields stay out of the command.
const compact = input => Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));

const COLUMN_ACTIONS = {
  add: input => ['addColumn', { pipelineId: id(input.pipelineId, COLUMN_ERROR), name: string(input.name, COLUMN_ERROR) }],
  rename: input => ['renameColumn', { columnId: id(input.columnId, COLUMN_ERROR), name: string(input.name, COLUMN_ERROR) }],
  move: input => ['moveColumn', { columnId: id(input.columnId, COLUMN_ERROR), toPosition: position(input.toPosition, COLUMN_ERROR) }],
  remove: input => ['removeColumn', { columnId: id(input.columnId, COLUMN_ERROR), targetColumnId: id(input.targetColumnId, COLUMN_ERROR) }],
};
const COMMENT_ACTIONS = {
  add: input => ['addComment', { taskId: id(input.taskId, COMMENT_ERROR), document: documentArray(input.document, COMMENT_ERROR) }],
  edit: input => ['editComment', { commentId: id(input.commentId, COMMENT_ERROR), document: documentArray(input.document, COMMENT_ERROR) }],
  remove: input => ['removeComment', { commentId: id(input.commentId, COMMENT_ERROR) }],
};
const source = value => {
  if (value === undefined || value === null) return undefined;
  const { noteId, origin } = object(value, TASK_ERROR);
  return { noteId: id(noteId, TASK_ERROR), origin: object(origin, TASK_ERROR) };
};

// channel -> (payload) -> [use case, command, answer with snapshot?]
const ROUTES = {
  'pipeline:column': payload => { const input = object(payload, COLUMN_ERROR); return [...(COLUMN_ACTIONS[input.action] || fail.bind(null, COLUMN_ERROR))(input), 'state']; },
  'task:create': payload => {
    const input = object(payload, TASK_ERROR);
    return ['createTask', compact({ pipelineId: id(input.pipelineId, TASK_ERROR), title: string(input.title, TASK_ERROR), owner: optional(input.owner, string, TASK_ERROR), description: optional(input.description, documentArray, TASK_ERROR), source: source(input.source) }), 'created'];
  },
  'task:update': payload => {
    const input = object(payload, TASK_ERROR);
    return ['updateTask', compact({ taskId: id(input.taskId, TASK_ERROR), title: optional(input.title, string, TASK_ERROR), owner: optional(input.owner, string, TASK_ERROR), description: optional(input.description, documentArray, TASK_ERROR) }), 'state'];
  },
  'task:move': payload => { const input = object(payload, TASK_ERROR); return ['moveTask', { taskId: id(input.taskId, TASK_ERROR), columnId: id(input.columnId, TASK_ERROR), position: position(input.position, TASK_ERROR) }, 'state']; },
  'task:trash': payload => ['trashTask', { taskId: id(payload, TASK_MISSING) }, 'state'],
  'task:restore': payload => ['restoreTask', { taskId: id(payload, TASK_MISSING) }, 'state'],
  'task:open': payload => ['openTask', { taskId: id(payload, TASK_MISSING) }, 'result'],
  'task:comment': payload => { const input = object(payload, COMMENT_ERROR); return [...(COMMENT_ACTIONS[input.action] || fail.bind(null, COMMENT_ERROR))(input), 'state']; },
  'task:attach-image': payload => {
    const input = object(payload, IMAGE_ERROR);
    return ['attachImage', { taskId: id(input.taskId, IMAGE_ERROR), name: string(input.name, IMAGE_ERROR).slice(0, 200), mime: string(input.mime, IMAGE_ERROR), dataURL: string(input.dataURL, IMAGE_ERROR) }, 'result'];
  },
};
const CHANNELS = Object.keys(ROUTES);
const REFUSED = { 'pipeline:column': COLUMN_ERROR, 'task:comment': COMMENT_ERROR, 'task:attach-image': IMAGE_ERROR, 'task:open': TASK_MISSING, 'task:trash': TASK_MISSING, 'task:restore': TASK_MISSING };

function registerPipelines(ipcMain, { getWindow, useCases, state }) {
  for (const [channel, route] of Object.entries(ROUTES)) {
    ipcMain.handle(channel, async (event, payload) => {
      if (event.sender !== getWindow()?.webContents) throw new Error(REFUSED[channel] || TASK_ERROR);
      const [name, command, answer] = route(payload);
      const result = useCases[name](command);
      if (answer === 'result') return result;
      if (answer === 'created') return { ...result, state: state() };
      return state();
    });
  }
}

module.exports = { registerPipelines, CHANNELS };
