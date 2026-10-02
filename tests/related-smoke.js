(async()=>{
 const command=async(name,input)=>{state=await window.notebook.action(name,input);};
 const clickAndWait=async button=>{const handler=button.onclick;let navigation;button.onclick=event=>{navigation=handler(event);};button.click();await navigation;};
 for(const [type,title,body] of [['notes','Um espaço para criar','Planejar o ateliê: iluminação, móveis e referências.'],['tasks','Preparar o ateliê',''],['reminders','Revisar as referências','Pesquisar iluminação para o ateliê.'],['notes','Luz natural','Uma janela e luz suave na mesa de trabalho.'],['notes','Ideias para a mesa','Móveis para organizar o ateliê.'],['notes','Materiais e cores','Referências de papel, tinta e madeira.']]) {
  await command('note:create',{type,title});await command('note:update',{id:state.selected[type],body});
 }
 const source=state.notes.find(n=>n.title==='Um espaço para criar');await command('note:select',{id:source.id});view='notes';render();
 window.verifyRelatedSmoke=async()=>{
  const assert=(v,label)=>{if(!v)throw Error(label);};
  await refreshRelated();assert(!$('#add-block')&&$('#related-open'),'Relacionados substitui + Bloco');
  assert($('#footer-label').querySelectorAll('button.related-whisper').length===2,'Rodapé mostra duas conexões clicáveis com ícones');
  assert($('#footer-label .related-prefix').textContent==='Relacionados:','Rodapé identifica os relacionados');
  const footerTarget=$('#footer-label [data-related-footer]').dataset.relatedFooter;
  await clickAndWait($('#footer-label [data-related-footer]'));
  assert('page:'+currentNote().id===footerTarget,'Título no rodapé abre a página relacionada');
  await command('note:select',{id:source.id});view='notes';render();await refreshRelated();
  await openRelated();assert($('#related-dialog').open,'Modal aberta');assert(document.querySelectorAll('[data-related-id]').length===6,'Grafo mostra as páginas do caderno');
  assert(document.querySelectorAll('.related-edges path').length===6,'Uma aresta por conexão');
  assert(!$('#related-content').textContent.match(/0\.\d|%/),'Sem pontuações visíveis');
  const ranked=(await window.notebook.related(source.id)).results;
  assert([...$('#footer-label').querySelectorAll('[data-related-footer]')].every((button,i)=>button.dataset.relatedFooter===ranked[i].id),'Rodapé segue afinidade decrescente');
  const fixture=[{id:'a',score:.9},{id:'b',score:.6},{id:'c',score:.9},{id:'d',score:.4}].map(d=>({...d,title:d.id,type:'notes'}));
  renderRelatedGraph(source,{results:fixture,status:'ready'});
  const center=$('.related-center').getBoundingClientRect();
  const distances=fixture.map(d=>{const rect=document.querySelector(`[data-related-id="${d.id}"]`).getBoundingClientRect();return Math.hypot(rect.x+rect.width/2-center.x-center.width/2,rect.y+rect.height/2-center.y-center.height/2);});
  assert(Math.abs(distances[0]-distances[2])<1,'Mesma afinidade tem mesma distância em ângulos diferentes');
  assert(distances[0]<distances[1]&&distances[1]<distances[3],'Afinidade maior fica visualmente mais próxima');
  const size=$('.related-graph').getBoundingClientRect();assert(Math.abs(size.width-size.height)<1,'Escala uniforme preserva distâncias');
  await refreshRelated();
  $('#related-close').click();assert(!$('#related-dialog').open,'Botão fecha a modal');
  await openRelated();await clickAndWait(document.querySelector('[data-related-id]'));assert(!$('#related-dialog').open&&currentNote().id!==source.id,'Conexão abre a página correspondente');
  await command('note:select',{id:source.id});view='notes';render();await openRelated();
  await new Promise(r=>setTimeout(r,300));
  assert($('#related-dialog').open&&currentNote().id===source.id,'Grafo permanece aberto na página de origem');
  return {errors:window.smokeErrors};
 };
 return {id:source.id};
})()
