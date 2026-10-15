// What the settings page shows about the local model.
const config = require('./model.cjs');

function modelInfo({ bytes, complete }, status) {
  return {
    name: config.model.split('/').pop(),
    revision: config.revision.slice(0, 7),
    quantization: config.dtype,
    sourceUrl: config.sourceUrl,
    bytes,
    state: complete ? 'downloaded' : status === 'loading' ? 'downloading' : 'absent',
  };
}

module.exports = { modelInfo };
