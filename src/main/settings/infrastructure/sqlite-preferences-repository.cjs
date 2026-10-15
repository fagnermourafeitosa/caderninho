// Preferences live in the settings table, one key per field; missing keys mean "use the default".
const KEYS = { alertMode: 'alert_mode', alertSound: 'alert_sound', alertVolume: 'alert_volume', keepOnTop: 'keep_on_top' };
const decode = { alertMode: String, alertSound: String, alertVolume: Number, keepOnTop: value => value === '1' };
const encode = { alertMode: String, alertSound: String, alertVolume: String, keepOnTop: value => (value ? '1' : '0') };

class SqlitePreferencesRepository {
  constructor(store) { this.store = store; }
  read() {
    const stored = {};
    for (const [field, key] of Object.entries(KEYS)) {
      const value = this.store.getSetting(key);
      if (value !== undefined) stored[field] = decode[field](value);
    }
    return stored;
  }
  write(changes) {
    this.store.transaction(() => { for (const [field, value] of Object.entries(changes)) this.store.setSetting(KEYS[field], encode[field](value)); });
  }
}

module.exports = { SqlitePreferencesRepository };
