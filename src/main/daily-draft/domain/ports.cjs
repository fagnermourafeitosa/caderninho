// Ports of the Daily draft context. Adapters live in infrastructure/.
/** @typedef {{ noteId: string, trashed: boolean }} DraftEntry */
/** @typedef {{ today(): string, transaction<T>(work: () => T): T, notebook(notebookId: string): void, find(notebookId: string, day: string): DraftEntry | null, createNote(notebookId: string): string, save(notebookId: string, day: string, noteId: string): void }} DailyDraftRepositoryPort */
module.exports = {};
