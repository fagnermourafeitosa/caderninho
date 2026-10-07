// Query: openTask({ taskId }) -> the task with description, comments, history and image thumbnails.
const { existingTask } = require('./guards.cjs');
const { imageUrl } = require('./attach-task-image.cjs');

function openTask(repository) {
  return ({ taskId }) => {
    const task = existingTask(repository, taskId);
    return {
      ...task,
      comments: repository.comments(taskId).map(({ id, document, text, createdAt, editedAt }) => ({ id, document, text, createdAt, editedAt })),
      movements: repository.movements(taskId),
      images: repository.images(taskId).map(image => ({ imageId: image.id, url: imageUrl(task.pipelineId, image.id) })),
    };
  };
}

module.exports = { openTask };
