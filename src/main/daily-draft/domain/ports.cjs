// Ports of the Daily draft context. Adapters live in infrastructure/.
/** @typedef {{ noteId: string, trashed: boolean }} DraftEntry */
/** @typedef {{ notebookId: string, day: string, noteId: string, title: string, body: string, media: number }} PastDraft */
/** @typedef {{ today(): string, transaction<T>(work: () => T): T, notebook(notebookId: string): void, find(notebookId: string, day: string): DraftEntry | null, createNote(notebookId: string): string, save(notebookId: string, day: string, noteId: string): void, pastDrafts(today: string): PastDraft[], trash(draft: PastDraft): void }} DailyDraftRepositoryPort */
module.exports = {};
