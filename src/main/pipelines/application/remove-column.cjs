// Command: removeColumn({ columnId, targetColumnId }) — its cards move to the target, each with a movement.
// Trashed tasks of the column lose it (ON DELETE SET NULL) and come back in the first column.
const { removeColumn: remove } = require('../domain/columns.cjs');
const { relocateColumn } = require('../domain/board.cjs');
const { columnOf, columnName } = require('./guards.cjs');

function removeColumn(repository) {
  return ({ columnId, targetColumnId }) => repository.transaction(() => {
    const { pipelineId } = columnOf(repository, columnId), stamp = repository.now();
    const columns = repository.columns(pipelineId), next = remove(columns, columnId, targetColumnId);
    const cards = repository.cards(pipelineId), relocated = relocateColumn(cards, columnId, targetColumnId);
    repository.saveCards(cards, relocated.cards, stamp);
    for (const { taskId, kind, fromColumnId, toColumnId, fromPosition, toPosition } of relocated.movements) {
      repository.addMovement(taskId, { kind, from: columnName(columns, fromColumnId), to: columnName(columns, toColumnId), fromPosition, toPosition }, stamp);
    }
    repository.saveColumns(pipelineId, next, stamp);
    repository.touch(pipelineId, stamp);
  });
}

module.exports = { removeColumn };
