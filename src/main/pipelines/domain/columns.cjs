// Pipeline columns: an ordered list whose last entry is the final column (tasks there are complete).
const DEFAULT_COLUMNS = ['Backlog', 'Ready to Dev', 'Doing', 'Review', 'Done'];
const NAME_ERROR = 'Escreva um nome de coluna com até 60 caracteres.';
const COLUMN_ERROR = 'Coluna inválida.';
const FINAL_ERROR = 'A coluna final não pode ser removida nem movida.';
const MINIMUM_ERROR = 'O pipeline precisa de pelo menos duas colunas.';
const TARGET_ERROR = 'Escolha para onde vão as tarefas.';
const MINIMUM_COLUMNS = 2;

function columnName(value) {
  const name = typeof value === 'string' ? value.trim() : '';
  if (!name || name.length > 60) throw new Error(NAME_ERROR);
  return name;
}

const createDefaultColumns = makeId => DEFAULT_COLUMNS.map(name => ({ id: makeId(), name }));
const finalColumn = columns => columns[columns.length - 1];
const isFinal = (columns, columnId) => finalColumn(columns)?.id === columnId;

function indexOf(columns, columnId) {
  const index = columns.findIndex(column => column.id === columnId);
  if (index < 0) throw new Error(COLUMN_ERROR);
  return index;
}

function addColumn(columns, name, id) {
  const column = { id, name: columnName(name) };
  return [...columns.slice(0, -1), column, finalColumn(columns)];
}

function renameColumn(columns, columnId, name) {
  const index = indexOf(columns, columnId), next = columnName(name);
  return columns.map((column, at) => (at === index ? { ...column, name: next } : column));
}

// Only non-final columns move, and only to positions before the final column.
function moveColumn(columns, columnId, toPosition) {
  const index = indexOf(columns, columnId);
  if (!Number.isInteger(toPosition) || toPosition < 0) throw new Error(COLUMN_ERROR);
  if (isFinal(columns, columnId) || toPosition >= columns.length - 1) throw new Error(FINAL_ERROR);
  const rest = columns.filter((_, at) => at !== index);
  return [...rest.slice(0, toPosition), columns[index], ...rest.slice(toPosition)];
}

// Validates the removal; moving the cards of the removed column is the board's job.
function removeColumn(columns, columnId, targetColumnId) {
  indexOf(columns, columnId);
  if (isFinal(columns, columnId)) throw new Error(FINAL_ERROR);
  if (columns.length <= MINIMUM_COLUMNS) throw new Error(MINIMUM_ERROR);
  if (targetColumnId === columnId || !columns.some(column => column.id === targetColumnId)) throw new Error(TARGET_ERROR);
  return columns.filter(column => column.id !== columnId);
}

module.exports = {
  DEFAULT_COLUMNS, NAME_ERROR, COLUMN_ERROR, FINAL_ERROR, MINIMUM_ERROR, TARGET_ERROR,
  columnName, createDefaultColumns, finalColumn, isFinal, addColumn, renameColumn, moveColumn, removeColumn,
};
