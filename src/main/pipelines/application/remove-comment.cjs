// Command: removeComment({ commentId }) — permanent; the renderer asks for confirmation first.
const { activeTask } = require('./guards.cjs');
const { COMMENT_MISSING } = require('./edit-comment.cjs');

function removeComment(repository) {
  return ({ commentId }) => repository.transaction(() => {
    const comment = repository.comment(commentId);
    if (!comment) throw new Error(COMMENT_MISSING);
    const current = activeTask(repository, comment.taskId);
    repository.deleteComment(commentId);
    repository.touch(current.pipelineId, repository.now());
  });
}

module.exports = { removeComment };
