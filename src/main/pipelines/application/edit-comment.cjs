// Command: editComment({ commentId, document }) — marks the comment as edited.
const { isEmpty, EMPTY_ERROR } = require('../domain/comment.cjs');
const { activeTask, taskDocument } = require('./guards.cjs');
const COMMENT_MISSING = 'Comentário não encontrado.';

function editComment(repository) {
  return ({ commentId, document }) => repository.transaction(() => {
    const comment = repository.comment(commentId);
    if (!comment) throw new Error(COMMENT_MISSING);
    const current = activeTask(repository, comment.taskId), doc = taskDocument(repository, comment.taskId, document);
    if (isEmpty(doc)) throw new Error(EMPTY_ERROR);
    const stamp = repository.now();
    repository.updateComment(commentId, doc, stamp);
    repository.touch(current.pipelineId, stamp);
  });
}

module.exports = { editComment, COMMENT_MISSING };
