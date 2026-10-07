// Task fields typed by the user.
const TITLE_ERROR = 'Escreva um título de até 500 caracteres.';
const OWNER_ERROR = 'Escreva um owner de até 120 caracteres.';

function title(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 500) throw new Error(TITLE_ERROR);
  return text;
}

function owner(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw new Error(OWNER_ERROR);
  const text = value.trim();
  if (text.length > 120) throw new Error(OWNER_ERROR);
  return text;
}

module.exports = { TITLE_ERROR, OWNER_ERROR, title, owner };
