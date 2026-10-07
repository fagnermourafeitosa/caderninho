// Command: addComment({ taskId, document })
const { isEmpty, EMPTY_ERROR } = require('../domain/comment.cjs');
const { activeTask, taskDocument } = require('./guards.cjs');

function addComment(repository, makeId) {
  return ({ taskId, document }) => repository.transaction(() => {
    const current = activeTask(repository, taskId), doc = taskDocument(repository, taskId, document);
    if (isEmpty(doc)) throw new Error(EMPTY_ERROR);
    const stamp = repository.now();
    repository.insertComment({ id: makeId(), taskId, document: doc }, stamp);
    repository.touch(current.pipelineId, stamp);
  });
}

module.exports = { addComment };
