// Card placement on a pipeline: each column keeps contiguous positions from 0.
// Every function returns new cards plus the movement it caused, for the task history.
const POSITION_ERROR = 'Posição inválida.';
const TASK_ERROR = 'Tarefa não encontrada.';

const inColumn = (cards, columnId) => cards.filter(card => card.columnId === columnId).sort((a, b) => a.position - b.position);
const movement = (kind, fromColumnId, toColumnId, fromPosition, toPosition) => ({ kind, fromColumnId, toColumnId, fromPosition, toPosition });

// Rewrites positions of the given column from an ordered id list.
function place(cards, columnId, orderedIds) {
  const positions = new Map(orderedIds.map((id, position) => [id, position]));
  return cards.map(card => (positions.has(card.id) ? { ...card, columnId, position: positions.get(card.id) } : card));
}

function insertTask(cards, taskId, columnId) {
  const ids = [taskId, ...inColumn(cards, columnId).map(card => card.id)];
  return { cards: place([...cards, { id: taskId, columnId, position: 0 }], columnId, ids), movement: movement('create', null, columnId, null, 0) };
}

function moveTask(cards, taskId, columnId, position) {
  if (!Number.isInteger(position) || position < 0) throw new Error(POSITION_ERROR);
  const current = cards.find(card => card.id === taskId);
  if (!current) throw new Error(TASK_ERROR);
  const source = inColumn(cards, current.columnId).map(card => card.id).filter(id => id !== taskId);
  const target = current.columnId === columnId ? source : inColumn(cards, columnId).map(card => card.id);
  const toPosition = Math.min(position, target.length);
  if (current.columnId === columnId && current.position === toPosition) return { cards, movement: null };
  const ordered = [...target.slice(0, toPosition), taskId, ...target.slice(toPosition)];
  let next = place(cards, columnId, ordered);
  if (current.columnId !== columnId) next = place(next, current.columnId, source);
  const kind = current.columnId === columnId ? 'reorder' : 'column';
  return { cards: next, movement: movement(kind, current.columnId, columnId, current.position, toPosition) };
}

function relocateColumn(cards, fromColumnId, toColumnId) {
  const target = inColumn(cards, toColumnId).map(card => card.id), moving = inColumn(cards, fromColumnId);
  const movements = moving.map((card, index) => ({ taskId: card.id, ...movement('column', fromColumnId, toColumnId, card.position, target.length + index) }));
  return { cards: place(cards, toColumnId, [...target, ...moving.map(card => card.id)]), movements };
}

function removeTask(cards, taskId) {
  const current = cards.find(card => card.id === taskId);
  if (!current) throw new Error(TASK_ERROR);
  const rest = cards.filter(card => card.id !== taskId);
  return place(rest, current.columnId, inColumn(rest, current.columnId).map(card => card.id));
}

function restoreTask(cards, taskId, columnId) {
  const { cards: next } = insertTask(cards, taskId, columnId);
  return { cards: next, movement: movement('restore', null, columnId, null, 0) };
}

module.exports = { POSITION_ERROR, TASK_ERROR, inColumn, insertTask, moveTask, relocateColumn, removeTask, restoreTask };
