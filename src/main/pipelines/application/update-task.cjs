// Command: updateTask({ taskId, title?, owner?, description? })
const task = require('../domain/task.cjs');
const { activeTask, taskDocument } = require('./guards.cjs');

function updateTask(repository) {
  return ({ taskId, title, owner, description }) => repository.transaction(() => {
    const current = activeTask(repository, taskId), stamp = repository.now();
    repository.updateTask(taskId, {
      title: title === undefined ? undefined : task.title(title),
      owner: owner === undefined ? undefined : task.owner(owner),
      description: description === undefined ? undefined : taskDocument(repository, taskId, description),
    }, stamp);
    repository.touch(current.pipelineId, stamp);
  });
}

module.exports = { updateTask };
