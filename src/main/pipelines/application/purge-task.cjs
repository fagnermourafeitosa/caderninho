// Command: purgeTask({ taskId }) — only from the trash; comments, history, images and files go with it.
const { TASK_MISSING } = require('./guards.cjs');
const NOT_IN_TRASH = 'Mova a tarefa para a lixeira primeiro.';

function purgeTask(repository, files) {
  return ({ taskId }) => {
    const current = repository.task(taskId);
    if (!current) throw new Error(TASK_MISSING);
    if (!current.deletedAt) throw new Error(NOT_IN_TRASH);
    const images = repository.images(taskId);
    repository.transaction(() => repository.deleteTask(taskId));
    for (const image of images) files.remove(current.pipelineId, image.file);
  };
}

module.exports = { purgeTask };
