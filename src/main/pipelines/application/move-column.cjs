// Command: moveColumn({ columnId, toPosition }) — only before the final column.
const { moveColumn: move } = require('../domain/columns.cjs');
const { columnOf } = require('./guards.cjs');

function moveColumn(repository) {
  return ({ columnId, toPosition }) => repository.transaction(() => {
    const { pipelineId } = columnOf(repository, columnId), stamp = repository.now();
    repository.saveColumns(pipelineId, move(repository.columns(pipelineId), columnId, toPosition), stamp);
    repository.touch(pipelineId, stamp);
  });
}

module.exports = { moveColumn };
