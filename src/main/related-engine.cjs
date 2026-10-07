const { createHash } = require('node:crypto');
const defaults = require('./related-config.cjs');
const pageDocument = require('../shared/editor-document.js');
const STOP = new Set('a o as os de da do das dos e em um uma para por com que no na nos nas se ao the and to of in on for is it a an'.split(' '));
function tokens(text) { return new Set(String(text).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().match(/[\p{L}\p{N}]{2,}/gu)?.filter(t=>!STOP.has(t)) || []); }
function overlap(a,b) { if(!a.size || !b.size) return 0; return [...a].filter(v=>b.has(v)).length / Math.sqrt(a.size*b.size); }
function cosine(a,b) { if(!a || !b || a.length!==b.length || !a.length) return 0; let dot=0,x=0,y=0; for(let i=0;i<a.length;i++){dot+=a[i]*b[i];x+=a[i]*a[i];y+=b[i]*b[i];} return x&&y?Math.max(-1,Math.min(1,dot/Math.sqrt(x*y))):0; }
// Diagram code is Mermaid syntax, not prose: it would relate pages by keywords like "flowchart".
const prose = note => note.editorDoc ? pageDocument.text(note.editorDoc.filter(block => block.type !== 'diagram')) : note.body;
function documents(state,ocr={}) {
  const out=[];
  for(const n of state.notes.filter(n=>!n.trashed)) {
    const categories=(n.categories||[]).map(c=>c.id);
    const text=[n.title,prose(n),...(n.cuts||[]).map(c=>[c.title,c.description,c.kind==='image'?ocr[c.blobId]||'':''].join('\n'))].filter(Boolean).join('\n');
    out.push({id:'page:'+n.id,noteId:n.id,notebookId:n.notebookId,type:n.type,title:n.title||'Sem título',text,categories});
  }
  for(const a of state.sourceActions||[]) out.push({id:'source:'+a.id,noteId:a.noteId,sourceActionId:a.id,notebookId:a.notebookId,type:'reminders',title:a.title,text:[a.title,a.origin?.quote].filter(Boolean).join('\n'),categories:out.find(d=>d.id==='page:'+a.noteId)?.categories||[]});
  return out.map(d=>({...d,hash:createHash('sha256').update(d.text).digest('hex')}));
}
function rank(source,docs,vectors,config=defaults) {
  const total=Object.values(config.weights).reduce((a,b)=>a+b,0); if(!(total>0)) return [];
  return docs.filter(d=>d.notebookId===source.notebookId&&d.noteId!==source.noteId&&d.text.trim()).map(d=>{
    const signals={categories:overlap(new Set(source.categories),new Set(d.categories)),lexical:overlap(tokens(source.text),tokens(d.text)),semantic:Math.max(0,Math.min(1,(cosine(vectors[source.id],vectors[d.id])-config.semanticFloor)/(config.semanticCeiling-config.semanticFloor)))};
    const score=Object.entries(config.weights).reduce((s,[k,w])=>s+w*(signals[k]||0),0)/total;
    return {...d,score};
  }).filter(d=>d.score>=config.threshold).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,config.limit).map(({text,hash,categories,...d})=>d);
}
module.exports={tokens,overlap,cosine,documents,rank};
