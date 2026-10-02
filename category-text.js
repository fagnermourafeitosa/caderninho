(function(root) {
  function normalize(value) {
    const name=String(value ?? '').trim().replace(/^#/,'').normalize('NFC').replace(/\s+/g,'-');
    if (!/^[\p{L}][\p{L}\p{N}_-]{0,47}$/u.test(name)) throw new Error('Use até 48 letras, números, hífens ou sublinhados, começando por uma letra.');
    return { name, key:name.toLocaleLowerCase('pt-BR') };
  }
  function tokens(text, pendingOffset=null) {
    text=String(text ?? '');
    const excluded=[...text.matchAll(/```[\s\S]*?(?:```|$)|`[^`\n]*`|https?:\/\/\S+/g)].map(match=>[match.index,match.index+match[0].length]);
    return [...text.matchAll(/(?<![\p{L}\p{N}_/\\])#([\p{L}][\p{L}\p{N}_-]{0,47})(?![\p{L}\p{N}_-])/gu)].filter(match=>!excluded.some(([start,end])=>match.index>=start && match.index<end) && !(Number.isInteger(pendingOffset) && pendingOffset>match.index && pendingOffset<=match.index+match[0].length)).map(match=>({ ...normalize(match[1]), start:match.index, end:match.index+match[0].length }));
  }
  const api={normalize,tokens};
  if(typeof module==='object'&&module.exports) module.exports=api; else root.categoryText=api;
})(typeof window==='object'?window:globalThis);
