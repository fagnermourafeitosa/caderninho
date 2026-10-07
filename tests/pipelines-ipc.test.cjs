const test = require('node:test');
const assert = require('node:assert/strict');
const { registerPipelines, CHANNELS } = require('../src/main/pipelines/presentation/ipc.cjs');
const { pipelineProtocolHandler } = require('../src/main/pipelines/presentation/protocol.cjs');

// ipcMain stand-in: records handlers so tests can invoke them like the renderer would.
function harness() {
  const handlers = new Map(), calls = [], main = { webContents: {} };
  const names = ['addColumn', 'renameColumn', 'moveColumn', 'removeColumn', 'createTask', 'updateTask', 'moveTask', 'trashTask', 'restoreTask', 'addComment', 'editComment', 'removeComment', 'attachImage', 'openTask'];
  const useCases = Object.fromEntries(names.map(name => [name, input => { calls.push([name, input]); return name === 'createTask' ? { taskId: 't1' } : name === 'attachImage' ? { imageId: 'i1', url: 'u' } : name === 'openTask' ? { id: input.taskId } : undefined; }]));
  registerPipelines({ handle: (channel, handler) => handlers.set(channel, handler) }, { getWindow: () => main, useCases, state: () => ({ snapshot: true }) });
  const invoke = (channel, payload, sender = main.webContents) => handlers.get(channel)({ sender }, payload);
  return { handlers, calls, invoke };
}
const doc = [{ id: 'p', type: 'paragraph', runs: [] }];

test('every pipeline channel is registered once', () => {
  const { handlers } = harness();
  assert.deepEqual([...handlers.keys()].sort(), [...CHANNELS].sort());
  assert.deepEqual([...CHANNELS].sort(), ['pipeline:column', 'task:attach-image', 'task:comment', 'task:create', 'task:move', 'task:open', 'task:restore', 'task:trash', 'task:update']);
});

test('requests from anything but the app window are refused before any use case runs', async () => {
  const { invoke, calls } = harness();
  for (const channel of CHANNELS) await assert.rejects(async () => invoke(channel, {}, { other: true }));
  assert.equal(calls.length, 0);
});

test('column actions are validated and dispatched, answering with the snapshot', async () => {
  const { invoke, calls } = harness();
  assert.deepEqual(await invoke('pipeline:column', { action: 'add', pipelineId: 'p1', name: 'QA' }), { snapshot: true });
  await invoke('pipeline:column', { action: 'rename', columnId: 'c1', name: 'Feito' });
  await invoke('pipeline:column', { action: 'move', columnId: 'c1', toPosition: 2 });
  await invoke('pipeline:column', { action: 'remove', columnId: 'c1', targetColumnId: 'c2' });
  assert.deepEqual(calls, [
    ['addColumn', { pipelineId: 'p1', name: 'QA' }], ['renameColumn', { columnId: 'c1', name: 'Feito' }],
    ['moveColumn', { columnId: 'c1', toPosition: 2 }], ['removeColumn', { columnId: 'c1', targetColumnId: 'c2' }],
  ]);
  for (const payload of [null, { action: 'drop', columnId: 'c1' }, { action: 'add', pipelineId: '../x', name: 'a' }, { action: 'rename', columnId: 'c1', name: 5 }, { action: 'move', columnId: 'c1', toPosition: '1' }, { action: 'remove', columnId: 'c1' }]) {
    await assert.rejects(async () => invoke('pipeline:column', payload), /Coluna inválida/);
  }
  assert.equal(calls.length, 4);
});

test('task commands keep only the known fields', async () => {
  const { invoke, calls } = harness();
  assert.deepEqual(await invoke('task:create', { pipelineId: 'p1', title: 'A', owner: 'Ana', description: doc, source: { noteId: 'n1', origin: { kind: 'line' } }, extra: 1 }), { taskId: 't1', state: { snapshot: true } });
  await invoke('task:update', { taskId: 't1', title: 'B', extra: true });
  await invoke('task:move', { taskId: 't1', columnId: 'c2', position: 0 });
  await invoke('task:trash', 't1');
  await invoke('task:restore', 't1');
  assert.deepEqual(await invoke('task:open', 't1'), { id: 't1' });
  assert.deepEqual(calls, [
    ['createTask', { pipelineId: 'p1', title: 'A', owner: 'Ana', description: doc, source: { noteId: 'n1', origin: { kind: 'line' } } }],
    ['updateTask', { taskId: 't1', title: 'B' }],
    ['moveTask', { taskId: 't1', columnId: 'c2', position: 0 }],
    ['trashTask', { taskId: 't1' }], ['restoreTask', { taskId: 't1' }], ['openTask', { taskId: 't1' }],
  ]);
});

test('malformed task payloads are refused with readable errors', async () => {
  const { invoke, calls } = harness();
  await assert.rejects(async () => invoke('task:create', { pipelineId: 'p1', title: 'A', description: 'texto' }), /Tarefa inválida/);
  await assert.rejects(async () => invoke('task:create', { pipelineId: 'p1', title: 'A', source: 'nota' }), /Tarefa inválida/);
  await assert.rejects(async () => invoke('task:update', { taskId: 't1', owner: 3 }), /Tarefa inválida/);
  await assert.rejects(async () => invoke('task:move', { taskId: 't1', columnId: 'c2', position: -1 }), /Tarefa inválida/);
  await assert.rejects(async () => invoke('task:open', '../../etc'), /Tarefa não encontrada/);
  assert.equal(calls.length, 0);
});

test('comments and images are validated and dispatched', async () => {
  const { invoke, calls } = harness();
  await invoke('task:comment', { action: 'add', taskId: 't1', document: doc });
  await invoke('task:comment', { action: 'edit', commentId: 'k1', document: doc });
  await invoke('task:comment', { action: 'remove', commentId: 'k1' });
  assert.deepEqual(await invoke('task:attach-image', { taskId: 't1', name: 'a.png', mime: 'image/png', dataURL: 'data:image/png;base64,AA==' }), { imageId: 'i1', url: 'u' });
  assert.deepEqual(calls.map(call => call[0]), ['addComment', 'editComment', 'removeComment', 'attachImage']);
  await assert.rejects(async () => invoke('task:comment', { action: 'add', taskId: 't1', document: {} }), /Comentário inválido/);
  await assert.rejects(async () => invoke('task:attach-image', { taskId: 't1', name: 'a', mime: 'image/png', dataURL: 7 }), /PNG, JPEG/);
});

test('the image protocol serves only files the pipeline owns', async () => {
  const fetched = [];
  const handler = pipelineProtocolHandler({ fetch: async url => { fetched.push(url); return 'file'; } }, ({ pipelineId, imageId }) => (pipelineId === 'p1' && imageId === 'i1' ? '/data/pipelines/p1/01-a.png' : null));
  assert.equal(await handler({ url: 'caderno-pipeline://p1/i1' }), 'file');
  assert.deepEqual(fetched, ['file:///data/pipelines/p1/01-a.png']);
  for (const url of ['caderno-pipeline://p1/i2', 'caderno-pipeline://p2/i1', 'caderno-pipeline://p1/..%2Fi1', 'caderno-pipeline://p1/i1/extra']) assert.equal((await handler({ url })).status, 404);
});
