// One indexing pass: read text from new images, embed changed documents, drop vectors of documents that are gone.
const config = require('../domain/model.cjs');
const { documents } = require('../domain/documents.cjs');

const indexPages = ({ pages, repository, engine, onProgress = () => {} }) => async () => {
  if (engine.canRecognize()) {
    for (const blobId of repository.imagesWithoutText()) {
      const file = pages.file(blobId);
      if (file) repository.saveOcr(blobId, await engine.recognize(file));
    }
  }
  const docs = documents(pages.snapshot(), repository.ocrText());
  for (const d of docs) {
    if (!d.text.trim()) continue;
    const stored = repository.vector(d.id);
    if (stored?.hash === d.hash && stored?.model === config.version) continue;
    const vector = await engine.embed(d.text);
    if (vector) { repository.saveVector(d.id, d.hash, config.version, vector); onProgress(); }
  }
  repository.pruneVectors(new Set(docs.map(d => d.id)));
};

module.exports = { indexPages };
