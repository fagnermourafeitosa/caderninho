/* Related pages: view component. Ranking, OCR and inference stay in the main process. */
let relatedRequest=0,homeRelatedRequest=0,relatedTimer,relatedFocus=null;
const relatedGraphIcon='<svg viewBox="0 0 24 24" aria-hidden="true" stroke="currentColor" stroke-width="1.8"><path d="M7 7L17 6M7 7L11 18M17 6L11 18" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="6" r="3"/><circle cx="11" cy="18" r="3"/></svg>';
function orderRelated(results){return [...results].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));}
function refreshRelatedSoon(){clearTimeout(relatedTimer);relatedTimer=setTimeout(refreshRelated,300);}
async function refreshRelated(){
 const request=++relatedRequest,note=['notes','tasks','reminders'].includes(view)?currentNote():null;
 const footer=$('#footer-label');footer.classList.add('related-footer');
 if(!note||!$('#related-open')){footer.replaceChildren();delete footer.dataset.connections;if(view==='home')await refreshHomeRelated();return;}
 try {
  const data=await window.notebook.related(note.id);
  data.results=orderRelated(data.results);
  if(request!==relatedRequest||currentNote()?.id!==note.id)return;
  const signature=JSON.stringify(data.results.map(d=>[d.id,d.title,d.score]));
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
function renderRelatedGraph(note,data,host=$('#related-content'),{openCenter=false}={}){
 if(!data.results.length){
  const text=data.status==='error'?'Não foi possível concluir a análise local. Suas páginas continuam salvas.':data.status==='loading'?'Preparando o modelo local. O primeiro uso baixa os arquivos; suas páginas ficam neste Mac.':data.status==='indexing'?'Lendo as páginas deste caderno… As conexões aparecem aqui quando estiverem prontas.':'Ainda não encontramos conexões relevantes para esta página.';
  host.innerHTML=`<div class="related-empty">${relatedGraphIcon}<p role="status">${text}</p>${data.status==='error'?'<button data-related-retry class="primary">Tentar novamente</button>':''}</div>`;
  if(host.querySelector('[data-related-retry]'))host.querySelector('[data-related-retry]').onclick=()=>window.notebook.relatedRetry();return;
 }
 // Stable angular slots; equal scaling on both axes preserves affinity distances.
 const nodes=[...data.results].sort((a,b)=>a.id.localeCompare(b.id));
 const points=nodes.map((node,i)=>{const angle=-Math.PI/2+i*2*Math.PI/nodes.length;const distance=1-Math.max(0,Math.min(1,node.score));const radius=openCenter?200+distance*50:125+distance*200;return {...node,x:320+Math.cos(angle)*radius,y:320+Math.sin(angle)*radius};});
 host.innerHTML=`${openCenter?'':'<p class="related-caption">Quanto mais perto desta página, mais afinidade. Clique para abrir.</p>'}<div class="related-graph" aria-label="Conexões desta página"><svg viewBox="0 0 640 640" class="related-edges" aria-hidden="true">${points.map(p=>`<path d="M320 320L${p.x} ${p.y}"/>`).join('')}</svg><${openCenter?'button type="button"':'div'} class="related-node related-center" style="left:50%;top:50%" ${openCenter?'aria-label="Abrir última nota"':''}>${icon(note.type)}<strong>${escape(note.title||'Sem título')}</strong><small>${openCenter?'Última nota':'Esta página'}</small></${openCenter?'button':'div'}>${points.map(p=>`<button class="related-node" data-related-id="${escape(p.id)}" style="left:${p.x/640*100}%;top:${p.y/640*100}%" aria-label="Abrir ${escape(p.title)}">${icon(p.type)}<span>${escape(p.title)}</span></button>`).join('')}</div>`;
 if(openCenter)host.querySelector('.related-center').onclick=()=>openRelatedPage({noteId:note.id});
 host.querySelectorAll('[data-related-id]').forEach(button=>button.onclick=async()=>{const target=points.find(p=>p.id===button.dataset.relatedId);if(host===$('#related-content'))$('#related-dialog').close();await openRelatedPage(target);});
}
async function refreshHomeRelated(){
 let host=$('#home-related-content');const note=latestHomeNote(),request=++homeRelatedRequest;
 if(view!=='home'||!host||!note)return;
 if(host.dataset.noteId!==note.id){host.closest('.home-connections').outerHTML=homeRelatedSection();bindHomePanels();renderHomeNotePreview();host=$('#home-related-content');}
 try{
  const data=await window.notebook.related(note.id);
  if(request!==homeRelatedRequest||view!=='home'||!host.isConnected||host.dataset.noteId!==note.id||latestHomeNote()?.id!==note.id)return;
  const results=orderRelated(data.results).slice(0,4),signature=JSON.stringify([note.title,data.status,results.map(item=>[item.id,item.title,item.score])]);
  if(host.dataset.connections===signature)return;
  const layout=host.closest('.home-connections-layout');host.dataset.connections=signature;
  if(!results.length){host.replaceChildren();layout.classList.remove('with-related');return;}
  renderRelatedGraph(note,{...data,results},host,{openCenter:true});layout.classList.add('with-related');
  host.insertAdjacentHTML('afterbegin',`<div class="daily-section-heading"><h2>${relatedGraphIcon}<span>Ideias por perto</span></h2></div>`);
 }catch{
  if(request===homeRelatedRequest&&host.isConnected){host.replaceChildren();host.closest('.home-connections-layout').classList.remove('with-related');}
 }
}
document.addEventListener('DOMContentLoaded',()=>{
 const dialog=$('#related-dialog');$('#related-close').onclick=()=>dialog.close();
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>relatedFocus?.isConnected&&relatedFocus.focus());
 window.notebook.onRelatedUpdated(refreshRelatedSoon);
});
