// caderno-pipeline://<pipelineId>/<imageId> serves a task image; only ids SQLite maps to a file of that pipeline resolve.
const { pathToFileURL } = require('node:url');
const SCHEME = 'caderno-pipeline';
const ID = /^[A-Za-z0-9_-]{1,128}$/;

function pipelineProtocolHandler(net, imageFile) {
  return async request => {
    const url = new URL(request.url), pipelineId = url.hostname, imageId = url.pathname.slice(1);
    const file = ID.test(pipelineId) && ID.test(imageId) ? imageFile({ pipelineId, imageId }) : null;
    return file ? net.fetch(pathToFileURL(file).href) : new Response('Imagem não encontrada', { status: 404 });
  };
}

module.exports = { SCHEME, pipelineProtocolHandler };
