(function (root) {
  const sameValue=(a,b)=>a.title===b.title&&a.body===b.body&&JSON.stringify(a.editorDoc??null)===JSON.stringify(b.editorDoc??null)&&JSON.stringify(a.mediaLayout??null)===JSON.stringify(b.mediaLayout??null);
  class EditHistory {
    constructor(value, { limit = 100, maxCharacters = 2_000_000, now = Date.now } = {}) {
      this.current = { ...value }; this.past = []; this.future = []; this.limit = limit; this.maxCharacters = maxCharacters; this.now = now; this.group = null; this.last = 0;
    }
    record(value, group = null) {
      if (sameValue(value,this.current)) { this.current.selection = value.selection; return false; }
      const time = this.now();
      if (!group || this.group !== group || time - this.last > 700 || !this.past.length) this.past.push(this.current);
      this.current = { ...value }; this.future = []; this.group = group; this.last = time;
      let characters = this.past.reduce((total, item) => total + item.title.length + item.body.length, 0);
      while (this.past.length > this.limit || (characters > this.maxCharacters && this.past.length > 1)) { const item = this.past.shift(); characters -= item.title.length + item.body.length; }
      return true;
    }
    reconcileMediaLayout(expected,actual) {
      for(const snapshot of [...this.past,this.current,...this.future])if(snapshot.mediaLayout===expected)snapshot.mediaLayout=actual;
      this.past=this.past.filter((value,index,items)=>!index||!sameValue(value,items[index-1]));
      while(this.past.length&&sameValue(this.past.at(-1),this.current))this.past.pop();
      const future=[];let previous=this.current;
      for(const snapshot of [...this.future].reverse())if(!sameValue(previous,snapshot)){future.push(snapshot);previous=snapshot;}
      this.future=future.reverse();
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
