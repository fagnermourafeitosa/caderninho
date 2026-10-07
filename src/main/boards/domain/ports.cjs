// Ports the Boards use cases depend on; infrastructure adapters implement them.

/** @typedef {{ elements: object[], viewport: { scrollX: number, scrollY: number, zoom: number } }} Scene */
/** @typedef {{ noteId: string, version: number, scene: Scene, fileIds: string[] }} Board */
/** @typedef {{ noteId: string, trashed: boolean }} BoardPage */

/**
 * @typedef {object} BoardRepositoryPort
 * @property {(noteId: string) => BoardPage|null} page the board page, or null when the id is not a board
 * @property {(noteId: string) => Board|null} load
 * @property {(board: Board & { text: string }) => { updated: string }} save commits scene, files and page text atomically
 * @property {(noteId: string) => { fileId: string, blobId: string, mime: string }[]} files
 * @property {(noteId: string, fileId: string, blobId: string) => void} attachFile
 * @property {(noteId: string, png: Buffer) => void} saveThumbnail
 * @property {(noteId: string) => Buffer|null} thumbnail
 */

/** @typedef {{ put(bytes: Buffer, mime: string): { blobId: string }, read(blobId: string): { bytes: Buffer, mime: string } | null }} MediaStorePort */
/** @typedef {{ choose(suggestedName: string, format: 'png'|'svg'): Promise<string|null>, write(target: string, bytes: Buffer): Promise<void> }} ExportTargetPort */
/** @typedef {{ boardSaved(event: { noteId: string, version: number }): void, boardImageAttached(event: { noteId: string, fileId: string, blobId: string }): void }} BoardEventsPort */

module.exports = {};
