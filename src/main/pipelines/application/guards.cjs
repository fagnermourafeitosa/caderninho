// Shared preconditions of the pipeline use cases.
const pageDocument = require('../../../shared/editor-document.js');
const { referencedImages } = require('../domain/task-image.cjs');

const PIPELINE_MISSING = 'Pipeline não encontrado.';
const PIPELINE_TRASHED = 'Restaure o pipeline primeiro.';
const TASK_MISSING = 'Tarefa não encontrada.';
const TASK_TRASHED = 'Restaure a tarefa primeiro.';
const COLUMN_MISSING = 'Coluna inválida.';
const IMAGE_MISSING = 'Imagem não encontrada.';

function activePipeline(repository, pipelineId) {
  const pipeline = repository.pipeline(pipelineId);
  if (!pipeline) throw new Error(PIPELINE_MISSING);
  if (pipeline.trashed) throw new Error(PIPELINE_TRASHED);
  return pipeline;
}

function columnOf(repository, columnId) {
  const column = repository.column(columnId);
  if (!column) throw new Error(COLUMN_MISSING);
  activePipeline(repository, column.pipelineId);
  return column;
}

function existingTask(repository, taskId) {
  const task = repository.task(taskId);
  if (!task) throw new Error(TASK_MISSING);
  activePipeline(repository, task.pipelineId);
  return task;
}

function activeTask(repository, taskId) {
  const task = existingTask(repository, taskId);
  if (task.deletedAt) throw new Error(TASK_TRASHED);
  return task;
}

// A description or comment, normalised; it may only show images attached to its own task.
function taskDocument(repository, taskId, doc) {
  const result = pageDocument.normalize(doc, { context: 'task' });
  for (const imageId of referencedImages(result)) if (repository.image(imageId)?.taskId !== taskId) throw new Error(IMAGE_MISSING);
  return result;
}

const columnName = (columns, columnId) => columns.find(column => column.id === columnId)?.name ?? null;

module.exports = { PIPELINE_MISSING, TASK_MISSING, IMAGE_MISSING, activePipeline, columnOf, existingTask, activeTask, taskDocument, columnName };
