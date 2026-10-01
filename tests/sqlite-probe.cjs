const { app } = require('electron');
try { const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(':memory:'); console.log('SQLITE_OK', db.prepare('select sqlite_version() as version').get()); db.close(); app.quit(); } catch (error) { console.error(error); app.exit(1); }
