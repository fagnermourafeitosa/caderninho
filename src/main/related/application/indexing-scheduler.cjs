// Indexing scheduler: debounces saves into passes, runs one pass at a time and exposes the status the UI shows.
// While disabled nothing is scheduled and the status stays "disabled", even if a stopped pass fails afterwards.
class IndexingScheduler {
  constructor({ pass, debounceMs, enabled = true, onUpdate = () => {}, log = message => console.error(message) }) {
    Object.assign(this, { pass, debounceMs, enabled, onUpdate, log });
    this.status = enabled ? 'idle' : 'disabled'; this.error = null; this.running = false; this.again = false; this.closed = false;
  }
  // Status reported by the engine while it loads the model.
  setStatus(status) { if (!this.enabled) return; this.status = status; this.onUpdate(); }
  setEnabled(enabled) {
    if (enabled === this.enabled) return;
    this.enabled = enabled;
    clearTimeout(this.timer); this.timer = undefined; this.again = false;
    this.status = enabled ? 'idle' : 'disabled'; this.error = null;
    this.onUpdate();
    if (enabled) this.schedule();
  }
  schedule() {
    if (this.closed || !this.enabled) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.runNow(), this.debounceMs);
  }
  async runNow() {
    if (this.closed || !this.enabled) return;
    if (this.running) { this.again = true; return; }
    this.running = true;
    this.current = this.execute();
    return this.current;
  }
  async execute() {
    this.status = 'indexing'; this.onUpdate();
    try {
      await this.pass();
      if (this.enabled) { this.status = 'ready'; this.error = null; }
    } catch (error) {
      if (this.closed || !this.enabled) return;
      this.status = 'error'; this.error = error.message; this.log(`Relacionados: ${error.message}`);
    } finally {
      this.running = false;
      if (!this.closed) { this.onUpdate(); if (this.again) { this.again = false; this.schedule(); } }
    }
  }
  // Resolves once no pass is running.
  settled() { return this.running ? this.current : Promise.resolve(); }
  // After the caches were cleared: forget the last outcome and index from scratch.
  restart() {
    if (this.closed || !this.enabled) return;
    this.status = 'idle'; this.error = null; this.onUpdate();
    this.schedule();
  }
  close() { this.closed = true; clearTimeout(this.timer); }
}

module.exports = { IndexingScheduler };
