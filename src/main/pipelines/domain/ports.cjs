// Ports the Pipelines use cases depend on; infrastructure adapters implement them.

/** @typedef {{ id: string, name: string }} Column */
/** @typedef {{ id: string, columnId: string, position: number }} Card */
/** @typedef {{ kind: 'create'|'column'|'reorder'|'restore', from: string|null, to: string, fromPosition: number|null, toPosition: number }} Movement */

/**
 * @typedef {object} PipelineRepositoryPort
 * @property {(work: () => any) => any} transaction runs the work in one SQLite transaction
 * @property {() => string} now ISO timestamp
 * @property {(pipelineId: string) => { id: string, trashed: boolean }|null} pipeline
 * @property {(pipelineId: string) => Column[]} columns ordered; the last one is final
 * @property {(pipelineId: string, columns: Column[], stamp: string) => void} saveColumns
 * @property {(pipelineId: string) => Card[]} cards active tasks only
 * @property {(before: Card[], after: Card[], stamp: string) => void} saveCards
 * @property {(taskId: string) => object|null} task
 * @property {(taskId: string, movement: Movement, stamp: string) => void} addMovement
 */

/** @typedef {{ write(pipelineId: string, file: string, bytes: Buffer): void, remove(pipelineId: string, file: string): void, path(pipelineId: string, file: string): string, list(): { pipelineId: string, files: string[] }[], removeStray(pipelineId: string, file: string): void, removeFolder(pipelineId: string): void }} PipelineImageStorePort */
/** @typedef {{ origin(source: { noteId: string, origin: object }): { noteId: string, origin: object } }} NoteSourcePort */

module.exports = {};
