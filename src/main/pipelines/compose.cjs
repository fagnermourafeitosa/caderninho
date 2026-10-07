// Composition of the Pipelines context: adapters wired into the use cases the IPC layer calls.
const { randomUUID } = require('node:crypto');
const { SqlitePipelineRepository } = require('./infrastructure/sqlite-pipeline-repository.cjs');
const { pipelineImageFiles } = require('./infrastructure/pipeline-image-files.cjs');
const { noteSources } = require('./infrastructure/note-sources.cjs');
const { addColumn } = require('./application/add-column.cjs');
const { renameColumn } = require('./application/rename-column.cjs');
const { moveColumn } = require('./application/move-column.cjs');
const { removeColumn } = require('./application/remove-column.cjs');
const { createTask } = require('./application/create-task.cjs');
const { updateTask } = require('./application/update-task.cjs');
const { moveTask } = require('./application/move-task.cjs');
const { trashTask } = require('./application/trash-task.cjs');
const { restoreTask } = require('./application/restore-task.cjs');
const { purgeTask } = require('./application/purge-task.cjs');
const { addComment } = require('./application/add-comment.cjs');
const { editComment } = require('./application/edit-comment.cjs');
const { removeComment } = require('./application/remove-comment.cjs');
const { attachTaskImage } = require('./application/attach-task-image.cjs');
const { openTask } = require('./application/open-task.cjs');
const { imageFile } = require('./application/image-file.cjs');
const { collectImages } = require('./application/collect-images.cjs');

function createPipelineUseCases({ store, makeId = randomUUID }) {
  const repository = new SqlitePipelineRepository(store), files = pipelineImageFiles(store.directory), notes = noteSources(store);
  return {
    addColumn: addColumn(repository, makeId),
    renameColumn: renameColumn(repository),
    moveColumn: moveColumn(repository),
    removeColumn: removeColumn(repository),
    createTask: createTask(repository, notes, makeId),
    updateTask: updateTask(repository),
    moveTask: moveTask(repository),
    trashTask: trashTask(repository),
    restoreTask: restoreTask(repository),
    purgeTask: purgeTask(repository, files),
    addComment: addComment(repository, makeId),
    editComment: editComment(repository),
    removeComment: removeComment(repository),
    attachImage: attachTaskImage(repository, files, makeId),
    openTask: openTask(repository),
    imageFile: imageFile(repository, files),
    collectImages: collectImages(repository, files),
  };
}

module.exports = { createPipelineUseCases };
