// Command: trashTask({ taskId }) — the card leaves the board and its column closes the gap.
const { removeTask } = require('../domain/board.cjs');
const { activeTask } = require('./guards.cjs');

function trashTask(repository) {
  return ({ taskId }) => repository.transaction(() => {
    const current = activeTask(repository, taskId), stamp = repository.now(), cards = repository.cards(current.pipelineId);
    repository.saveCards(cards, removeTask(cards, taskId), stamp);
    repository.setDeleted(taskId, stamp, stamp);
    repository.touch(current.pipelineId, stamp);
  });
}

module.exports = { trashTask };
