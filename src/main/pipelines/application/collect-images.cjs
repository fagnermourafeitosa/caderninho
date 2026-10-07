// Command: collectImages() — run at startup and after purges, when no editor draft can still hold an image.
// Removes image rows no description or comment refers to, files without a row and folders of deleted pipelines.
const { referencedImages } = require('../domain/task-image.cjs');

function collectImages(repository, files) {
  return () => {
    const used = new Map();
    const referenced = taskId => {
      if (!used.has(taskId)) {
        const task = repository.task(taskId), ids = referencedImages(task?.description);
        for (const comment of repository.comments(taskId)) for (const id of referencedImages(comment.document)) ids.add(id);
        used.set(taskId, ids);
      }
      return used.get(taskId);
    };
    for (const image of repository.allImages()) {
      if (referenced(image.taskId).has(image.id)) continue;
      repository.transaction(() => repository.deleteImage(image.id));
      files.remove(image.pipelineId, image.file);
    }
    const pipelines = new Set(repository.pipelineIds()), kept = new Set(repository.allImages().map(image => `${image.pipelineId}/${image.file}`));
    for (const { pipelineId, files: names } of files.list()) {
      if (!pipelines.has(pipelineId)) { files.removeFolder(pipelineId); continue; }
      for (const name of names) if (!kept.has(`${pipelineId}/${name}`)) files.removeStray(pipelineId, name);
    }
  };
}

module.exports = { collectImages };
