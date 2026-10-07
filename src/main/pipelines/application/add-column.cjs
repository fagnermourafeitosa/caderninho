// Command: addColumn({ pipelineId, name }) — the new column goes right before the final one.
const { addColumn: add } = require('../domain/columns.cjs');
const { activePipeline } = require('./guards.cjs');

function addColumn(repository, makeId) {
  return ({ pipelineId, name }) => repository.transaction(() => {
    activePipeline(repository, pipelineId);
    const stamp = repository.now();
    repository.saveColumns(pipelineId, add(repository.columns(pipelineId), name, makeId()), stamp);
    repository.touch(pipelineId, stamp);
  });
}

module.exports = { addColumn };
