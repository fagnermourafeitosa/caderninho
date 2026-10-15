// Embedding engine: the model and the OCR helper run in a worker thread, started on the first job.
const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');

class EmbeddingWorkerClient {
  constructor({ cacheDir, ocrPath, onStatus = () => {} }) {
    Object.assign(this, { cacheDir, ocrPath, onStatus });
    this.serial = 0; this.pending = new Map(); this.thread = null;
  }
  worker() {
    if (this.thread) return this.thread;
    this.thread = new Worker(path.join(__dirname, 'embedding-worker.cjs'), { workerData: { cacheDir: this.cacheDir, ocrPath: this.ocrPath } });
    this.thread.on('message', message => {
      if (message.status) { this.onStatus(message.status); return; }
      const job = this.pending.get(message.id);
      if (job) { this.pending.delete(message.id); message.error ? job.reject(Error(message.error)) : job.resolve(message.result); }
    });
    this.thread.on('error', error => { this.failPending(error); this.thread = null; });
    this.thread.on('exit', () => { this.failPending(Error('Processo de indexação encerrado.')); this.thread = null; });
    return this.thread;
  }
  failPending(error) { for (const job of this.pending.values()) job.reject(error); this.pending.clear(); }
  job(input) {
    return new Promise((resolve, reject) => { const id = ++this.serial; this.pending.set(id, { resolve, reject }); this.worker().postMessage({ ...input, id }); });
  }
  embed(text) { return this.job({ kind: 'embed', text }); }
  recognize(file) { return this.job({ kind: 'ocr', file }); }
  // The OCR helper is a macOS binary that may be missing in development builds.
  canRecognize() { return process.platform === 'darwin' && fs.existsSync(this.ocrPath || ''); }
  async stop() { await this.thread?.terminate(); }
}

module.exports = { EmbeddingWorkerClient };
