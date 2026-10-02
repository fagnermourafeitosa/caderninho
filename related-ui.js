/* Related pages: view component. Ranking, OCR and inference stay in the main process. */
let relatedRequest=0,relatedTimer,relatedFocus=null;
const relatedGraphIcon='<svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="1.8"><path d="M7 7L17 6M7 7L11 18M17 6L11 18" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="6" r="3"/><circle cx="11" cy="18" r="3"/></svg>';
function refreshRelatedSoon(){clearTimeout(relatedTimer);relatedTimer=setTimeout(refreshRelated,300);}
async function refreshRelated(){
 const request=++relatedRequest,note=['notes','tasks','reminders'].includes(view)?currentNote():null;
 const footer=$('#footer-label');footer.classList.add('related-footer');
 if(!note||!$('#related-open')){footer.replaceChildren();delete footer.dataset.connections;return;}
 try {
  const data=await window.notebook.related(note.id);
  if(request!==relatedRequest||currentNote()?.id!==note.id)return;
  const signature=JSON.stringify(data.results.map(d=>[d.id,d.title]));
  if(footer.dataset.connections!==signature){
   footer.dataset.connections=signature;
   footer.innerHTML=data.results.length?'<span class="related-prefix">Relacionados:</span>'+data.results.slice(0,2).map(d=>`<button type="button" class="related-whisper" data-related-footer="${escape(d.id)}" aria-label="Abrir ${escape(d.title)}" title="${escape(d.title)}">${icon(d.type)}<span>${escape(d.title)}</span></button>`).join(''):'';
   footer.querySelectorAll('[data-related-footer]').forEach(button=>button.onclick=()=>openRelatedPage(data.results.find(d=>d.id===button.dataset.relatedFooter)));
  }
  if($('#related-dialog').open)renderRelatedGraph(note,data);
 }catch{if(request===relatedRequest)footer.replaceChildren();}
}
async function openRelatedPage(target){
 if(!target)return;
 if(target.sourceActionId){await openSourceOrigin(target.sourceActionId);return;}
 await turn('note:select',{id:target.noteId});
}
async function openRelated(){
 relatedFocus=document.activeElement;const dialog=$('#related-dialog');dialog.showModal();
 $('#related-content').innerHTML='<p class="related-empty" role="status">À procura de conexões neste caderno…</p>';
 await refreshRelated();
}
function renderRelatedGraph(note,data){
 const host=$('#related-content');
 if(!data.results.length){
  const text=data.status==='error'?'Não foi possível concluir a análise local. Suas páginas continuam salvas.':data.status==='loading'?'Preparando o modelo local. O primeiro uso baixa os arquivos; suas páginas ficam neste Mac.':data.status==='indexing'?'Lendo as páginas deste caderno… As conexões aparecem aqui quando estiverem prontas.':'Ainda não encontramos conexões relevantes para esta página.';
  host.innerHTML=`<div class="related-empty">${relatedGraphIcon}<p role="status">${text}</p>${data.status==='error'?'<button id="related-retry" class="primary">Tentar novamente</button>':''}</div>`;
  if($('#related-retry'))$('#related-retry').onclick=()=>window.notebook.relatedRetry();return;
 }
 // Stable slots, radial distance based on combined affinity; no scores in the UI.
 const nodes=[...data.results].sort((a,b)=>a.id.localeCompare(b.id));
 const points=nodes.map((node,i)=>{const angle=-Math.PI/2+i*2*Math.PI/nodes.length;const radius=145+(1-node.score)*95;return {...node,x:380+Math.cos(angle)*radius*1.20,y:265+Math.sin(angle)*radius*0.90};});
 host.innerHTML=`<p class="related-caption">Páginas mais próximas têm mais em comum. Clique para abrir.</p><div class="related-graph" aria-label="Conexões desta página"><svg viewBox="0 0 760 530" class="related-edges" aria-hidden="true">${points.map(p=>`<path d="M380 265L${p.x} ${p.y}"/>`).join('')}</svg><div class="related-node related-center" style="left:50%;top:50%">${icon(note.type)}<strong>${escape(note.title||'Sem título')}</strong><small>Esta página</small></div>${points.map(p=>`<button class="related-node" data-related-id="${escape(p.id)}" style="left:${p.x/760*100}%;top:${p.y/530*100}%" aria-label="Abrir ${escape(p.title)}">${icon(p.type)}<span>${escape(p.title)}</span></button>`).join('')}</div>`;
 host.querySelectorAll('[data-related-id]').forEach(button=>button.onclick=async()=>{const target=points.find(p=>p.id===button.dataset.relatedId);$('#related-dialog').close();await openRelatedPage(target);});
}
document.addEventListener('DOMContentLoaded',()=>{
 const dialog=$('#related-dialog');$('#related-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>relatedFocus?.isConnected&&relatedFocus.focus());
 window.notebook.onRelatedUpdated(refreshRelatedSoon);
});
