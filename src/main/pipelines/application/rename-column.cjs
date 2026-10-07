// Command: renameColumn({ columnId, name }) — any column, the final one included.
const { renameColumn: rename } = require('../domain/columns.cjs');
const { columnOf } = require('./guards.cjs');

function renameColumn(repository) {
  return ({ columnId, name }) => repository.transaction(() => {
    const { pipelineId } = columnOf(repository, columnId), stamp = repository.now();
    repository.saveColumns(pipelineId, rename(repository.columns(pipelineId), columnId, name), stamp);
    repository.touch(pipelineId, stamp);
  });
}

module.exports = { renameColumn };
