(function (root) {
  class EditHistory {
    constructor(value, { limit = 100, maxCharacters = 2_000_000, now = Date.now } = {}) {
      this.current = { ...value }; this.past = []; this.future = []; this.limit = limit; this.maxCharacters = maxCharacters; this.now = now; this.group = null; this.last = 0;
    }
    record(value, group = null) {
      if (value.title === this.current.title && value.body === this.current.body) { this.current.selection = value.selection; return false; }
      const time = this.now();
      if (!group || this.group !== group || time - this.last > 700 || !this.past.length) this.past.push(this.current);
      this.current = { ...value }; this.future = []; this.group = group; this.last = time;
      let characters = this.past.reduce((total, item) => total + item.title.length + item.body.length, 0);
      while (this.past.length > this.limit || (characters > this.maxCharacters && this.past.length > 1)) { const item = this.past.shift(); characters -= item.title.length + item.body.length; }
      return true;
    }
    step(direction) {
      const from = direction === 'undo' ? this.past : this.future, to = direction === 'undo' ? this.future : this.past;
      if (!from.length) return null;
      to.push(this.current); this.current = from.pop(); this.group = null; return { ...this.current };
    }
  }
  if (typeof module === 'object' && module.exports) module.exports = { EditHistory };
  else root.EditHistory = EditHistory;
})(typeof window === 'object' ? window : globalThis);
