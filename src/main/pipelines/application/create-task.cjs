// Command: createTask({ pipelineId, title, owner, description, source }) -> { taskId }
// The task is born on top of the first column; a note source links it back to the note.
const { insertTask } = require('../domain/board.cjs');
const task = require('../domain/task.cjs');
const { activePipeline, taskDocument } = require('./guards.cjs');

function createTask(repository, notes, makeId) {
  return ({ pipelineId, title, owner, description = [], source = null }) => repository.transaction(() => {
    activePipeline(repository, pipelineId);
    const id = makeId(), fields = { title: task.title(title), owner: task.owner(owner) };
    const document = taskDocument(repository, id, description);
    const origin = source ? notes.origin(source) : null;
    const columns = repository.columns(pipelineId), first = columns[0], stamp = repository.now();
    repository.insertTask({ id, pipelineId, columnId: first.id, ...fields, description: document, source: origin }, stamp);
    const cards = repository.cards(pipelineId), placed = insertTask(cards.filter(card => card.id !== id), id, first.id);
    repository.saveCards(cards, placed.cards, stamp);
    repository.addMovement(id, { kind: 'create', from: null, to: first.name, fromPosition: null, toPosition: 0 }, stamp);
    repository.touch(pipelineId, stamp);
    return { taskId: id };
  });
}

module.exports = { createTask };
