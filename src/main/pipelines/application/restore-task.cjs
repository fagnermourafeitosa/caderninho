// Command: restoreTask({ taskId }) — back on top of its column, or of the first column when that one is gone.
const { restoreTask: restore } = require('../domain/board.cjs');
const { existingTask } = require('./guards.cjs');
const NOT_TRASHED = 'A tarefa já está no pipeline.';

function restoreTask(repository) {
  return ({ taskId }) => repository.transaction(() => {
    const current = existingTask(repository, taskId);
    if (!current.deletedAt) throw new Error(NOT_TRASHED);
    const stamp = repository.now(), columns = repository.columns(current.pipelineId);
    const column = columns.find(item => item.id === current.columnId) || columns[0];
    const cards = repository.cards(current.pipelineId), result = restore(cards, taskId, column.id);
    repository.setDeleted(taskId, null, stamp);
    repository.saveCards(cards, result.cards, stamp);
    repository.addMovement(taskId, { kind: 'restore', from: null, to: column.name, fromPosition: null, toPosition: 0 }, stamp);
    repository.touch(current.pipelineId, stamp);
  });
}

module.exports = { restoreTask };
