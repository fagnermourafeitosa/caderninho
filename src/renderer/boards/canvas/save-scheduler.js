// Board autosave timing: 400 ms after the last change, one save in flight, immediate flush on leave.
const DELAY = 400;

function createSaveScheduler({ persist, onError = () => {}, setTimeout = globalThis.setTimeout, clearTimeout = globalThis.clearTimeout }) {
  let dirty = false, timer = null, inflight = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(run, DELAY); };
  function run() {
    timer = null;
    if (inflight) return inflight;
    dirty = false;
    let failed = false;
    let started;
    try { started = Promise.resolve(persist()); } catch (error) { started = Promise.reject(error); }
    inflight = started
      .catch(error => { failed = true; dirty = true; onError(error); })
      .finally(() => { inflight = null; if (dirty && !failed) schedule(); });
    return inflight;
  }
  return {
    changed() { dirty = true; schedule(); },
    pending: () => dirty || Boolean(inflight),
    // Saves what is pending now; a failure stays pending and is not retried in a loop.
    async flush() {
      clearTimeout(timer); timer = null;
      if (inflight) await inflight;
      clearTimeout(timer); timer = null;
      if (dirty) await run();
    },
    dispose() { clearTimeout(timer); timer = null; },
  };
}

module.exports = { createSaveScheduler, DELAY };
