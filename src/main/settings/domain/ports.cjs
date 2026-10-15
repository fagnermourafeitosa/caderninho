// Ports the Settings use cases depend on; infrastructure adapters implement them.

/** @typedef {{ alertMode: 'sound-and-notification'|'sound'|'notification', alertSound: string, alertVolume: number, keepOnTop: boolean }} Preferences */
/** @typedef {{ read(): Partial<Preferences>, write(changes: Partial<Preferences>): void }} PreferencesRepositoryPort */
/** @typedef {{ list(): { id: string, label: string }[], file(id: string): string|null }} SoundCatalogPort */
/** @typedef {{ play(input: { file: string, volume: number }): void }} SoundPlayerPort */
/** @typedef {{ setKeepOnTop(on: boolean): void }} WindowPlacementPort */
/** @typedef {{ open(): Promise<void> }} NotificationSettingsPort */
/** @typedef {{ supported(): boolean, show(input: { title: string, body: string }): void }} NotificationSenderPort */

module.exports = {};
