// Query: imageFile({ pipelineId, imageId }) -> absolute file path, or null when the image is not in that pipeline.
// The caderno-pipeline:// host is lowercased by URL parsing, so the pipeline id is compared without case.
function imageFile(repository, files) {
  return ({ pipelineId, imageId }) => {
    const image = repository.image(imageId);
    return image && image.pipelineId.toLowerCase() === String(pipelineId).toLowerCase() ? files.path(image.pipelineId, image.file) : null;
  };
}

module.exports = { imageFile };
