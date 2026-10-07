// Command: moveTask({ taskId, columnId, position }) — a column change or a reorder, recorded in the history.
const { moveTask: move } = require('../domain/board.cjs');
const { activeTask, columnOf, columnName } = require('./guards.cjs');
const { COLUMN_ERROR } = require('../domain/columns.cjs');

function moveTask(repository) {
  return ({ taskId, columnId, position }) => repository.transaction(() => {
    const current = activeTask(repository, taskId), column = columnOf(repository, columnId);
    if (column.pipelineId !== current.pipelineId) throw new Error(COLUMN_ERROR);
    const stamp = repository.now(), columns = repository.columns(current.pipelineId), cards = repository.cards(current.pipelineId);
    const result = move(cards, taskId, columnId, position);
    if (!result.movement) return;
    const { kind, fromColumnId, toColumnId, fromPosition, toPosition } = result.movement;
    repository.saveCards(cards, result.cards, stamp);
    repository.addMovement(taskId, { kind, from: columnName(columns, fromColumnId), to: columnName(columns, toColumnId), fromPosition, toPosition }, stamp);
    repository.touch(current.pipelineId, stamp);
  });
}

module.exports = { moveTask };
