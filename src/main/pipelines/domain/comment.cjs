// A comment must say something: some text or at least one image.
const EMPTY_ERROR = 'Comentário vazio.';
const runText = runs => (Array.isArray(runs) ? runs.map(run => run.text).join('') : '');

function blockHasContent(block) {
  if (block.type === 'image' || block.type === 'diagram') return true;
  if (block.type === 'table') return block.rows.some(row => row.some(cell => runText(cell).trim()));
  return Boolean(runText(block.runs).trim());
}

const isEmpty = doc => !doc.some(blockHasContent);

module.exports = { EMPTY_ERROR, isEmpty };
