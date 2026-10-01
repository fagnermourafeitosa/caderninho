(function (root) {
  const checkbox = text => String(text).match(/^\s*(?:-\s*)?\[([ xX]?)\][ \t]?/);
  // Explicit day + time only: never guess an hour or activate an alarm while typing.
  function suggestions(text, now = new Date()) {
    const clean = String(text).replace(/```[\s\S]*?```/g, '').replace(/https?:\/\/\S+/g, '');
    const dates = /\b(hoje|amanh[ãa]|depois de amanh[ãa]|\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s+(?:[àa]s?\s+)?(\d{1,2})(?:(?:h(?:(\d{2}))?)|:(\d{2}))\b/gi;
    const results = [], seen = new Set();
    for (const match of clean.matchAll(dates)) {
      const hour = Number(match[2]), minute = Number(match[3] || match[4] || 0);
      if (hour > 23 || minute > 59) continue;
      const date = new Date(now); date.setHours(hour, minute, 0, 0);
      const day = match[1].toLowerCase();
      if (day === 'hoje') {}
      else if (/^depois/.test(day)) date.setDate(date.getDate() + 2);
      else if (/^amanh/.test(day)) date.setDate(date.getDate() + 1);
      else {
        const [d, m, y] = day.split('/').map(Number);
        const year = y || now.getFullYear(); date.setFullYear(year, m - 1, d);
        if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== year) continue;
        if (!y && date <= now) { date.setFullYear(year + 1); if (date.getDate() !== d || date.getMonth() !== m - 1) continue; }
      }
      if (date <= now || seen.has(date.toISOString())) continue;
      seen.add(date.toISOString()); results.push({ due: date.toISOString(), phrase: match[0] });
    }
    return results;
  }
  const api = { checkbox, suggestions };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.smartText = api;
})(typeof window === 'object' ? window : globalThis);
