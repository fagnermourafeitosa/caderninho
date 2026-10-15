// Query: the pages related to one note, ranked from the vectors that still match their content.
const config = require('../domain/model.cjs');
const { documents } = require('../domain/documents.cjs');
const { rank } = require('../domain/ranking.cjs');
const { preferences, rankingConfig } = require('../domain/preferences.cjs');

const queryRelated = ({ pages, repository, status }) => noteId => {
  if (status() === 'disabled') return { status: 'disabled', results: [] };
  const docs = documents(pages.snapshot(), repository.ocrText());
  const source = docs.find(d => d.id === 'page:' + noteId);
  if (!source) return { status: status(), results: [] };
  const hashes = new Map(docs.map(d => [d.id, d.hash])), vectors = {};
  for (const row of repository.vectors(config.version)) if (hashes.get(row.id) === row.hash) vectors[row.id] = row.vector;
  const ranking = rankingConfig(preferences(repository.preferences()));
  return { status: status(), results: vectors[source.id] ? rank(source, docs.filter(d => vectors[d.id]), vectors, ranking) : [] };
};

module.exports = { queryRelated };
