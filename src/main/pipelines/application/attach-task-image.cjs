// Command: attachTaskImage({ taskId, name, mime, dataURL }) -> { imageId, url }
// The file is written first and removed again if the row cannot be committed.
const { parseImage, fileName } = require('../domain/task-image.cjs');
const { activeTask } = require('./guards.cjs');

const imageUrl = (pipelineId, imageId) => `caderno-pipeline://${pipelineId}/${imageId}`;

function attachTaskImage(repository, files, makeId) {
  return ({ taskId, name, mime, dataURL }) => {
    const current = activeTask(repository, taskId), image = parseImage({ mime, dataURL });
    const id = makeId(), number = repository.nextImageNumber(current.pipelineId), file = fileName(number, name, image.mime);
    files.write(current.pipelineId, file, image.bytes);
    try {
      repository.transaction(() => repository.insertImage({ id, pipelineId: current.pipelineId, taskId, number, file, mime: image.mime, bytes: image.bytes.length }, repository.now()));
    } catch (error) { files.remove(current.pipelineId, file); throw error; }
    return { imageId: id, url: imageUrl(current.pipelineId, id) };
  };
}

module.exports = { attachTaskImage, imageUrl };
