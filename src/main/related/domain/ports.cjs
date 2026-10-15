// Ports the Related pages use cases depend on; infrastructure adapters implement them.

/** @typedef {{ snapshot(): object, file(blobId: string): string|null }} PageSourcePort */
/**
 * @typedef {object} RelatedRepositoryPort
 * @property {(id: string) => { hash: string, model: string }|undefined} vector
 * @property {(model: string) => { id: string, hash: string, vector: number[] }[]} vectors
 * @property {(id: string, hash: string, model: string, vector: number[]) => void} saveVector
 * @property {(activeIds: Set<string>) => void} pruneVectors
 * @property {() => void} clearVectors
 * @property {() => Record<string, string>} ocrText
 * @property {() => string[]} imagesWithoutText blob ids of active images not read yet
 * @property {(blobId: string, text: string) => void} saveOcr
 * @property {() => object} preferences stored related preferences
 * @property {(changes: object) => void} savePreferences one transaction
 */
/** @typedef {{ embed(text: string): Promise<number[]|null>, recognize(file: string): Promise<string>, canRecognize(): boolean, stop(): Promise<void> }} EmbeddingEnginePort */

/** @typedef {{ info(): { bytes: number, complete: boolean }, remove(): void }} ModelFolderPort */

module.exports = {};
