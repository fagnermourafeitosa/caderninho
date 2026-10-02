// All ranking decisions live here, independently from the graph UI.
module.exports = Object.freeze({
  weights: { categories: 0.20, lexical: 0.15, semantic: 0.65 },
  // Calibrated against local PT-BR notes: related pairs around 0.41–0.47
  // were incorrectly rejected by the original 0.48 cutoff.
  threshold: 0.40,
  semanticFloor: 0.30,
  semanticCeiling: 0.85,
  limit: 8,
  debounceMs: 1100,
  model: 'onnx-community/embeddinggemma-300m-ONNX',
  revision: '5090578d9565bb06545b4552f76e6bc2c93e4a66',
  dtype: 'q4',
  version: 'embeddinggemma-5090578-q4-sentence-similarity-v1',
});
