(async()=>{
  const wait=async()=>{await new Promise(resolve=>setTimeout(resolve,180));const deadline=Date.now()+3000;while(pending&&Date.now()<deadline) await new Promise(resolve=>setTimeout(resolve,20));if(pending)throw new Error('Salvamento não terminou');};
  const assert=(value,message)=>{if(!value)throw new Error(message);};
  const first=state.activeNotebook;
  document.querySelector('[data-view=notebooks]').click();await wait();
  assert(document.querySelectorAll('[data-view]')[1].dataset.view==='notebooks','Cadernos é o segundo item');
  $('#notebook-tab-add').click();assert($('#notebook-dialog').open,'Última aba abre modal');
  $('#notebook-name').value='Projetos';$('#notebook-description').value='Planos e ideias';
  const color=state.notebookColors[1];document.querySelector(`#notebook-colors input[value="${color}"]`).click();$('#notebook-form').requestSubmit();await wait();
  const book=state.activeNotebook;assert(book!==first,'Novo caderno fica selecionado');assert(state.notebooks.find(item=>item.id===book).color===color,'Paleta guarda a cor');
  const tab=document.querySelector(`[data-book-tab="${book}"]`),other=document.querySelector(`[data-book-tab="${first}"]`);
  assert(getComputedStyle(tab.querySelector('span')).opacity==='1','Caderno selecionado mantém nome visível');assert(getComputedStyle(other.querySelector('span')).opacity==='0','Caderno inativo recolhe o texto');
  assert(other.getBoundingClientRect().width===22 && tab.getBoundingClientRect().width===30,'Abas têm metade da largura anterior');assert(getComputedStyle(tab.querySelector('span')).writingMode==='vertical-rl','Nome fica vertical');
  document.querySelector(`[data-edit-book="${book}"]`).click();$('#notebook-name').value='Projetos pessoais';$('#notebook-form').requestSubmit();await wait();assert(state.notebooks.find(item=>item.id===book).name==='Projetos pessoais','Editar caderno');
  document.querySelector(`[data-open-book="${book}"]`).click();await wait();assert(view==='notes'&&!currentNote(),'Abrir caderno novo mostra notas vazias');
  state=await window.notebook.action('note:create',{type:'notes',title:'Planejamento'});render();assert(currentNote().notebookId===book,'Nova nota recebe caderno atual');
  $('#note-notebook').value=first;$('#note-notebook').dispatchEvent(new Event('change',{bubbles:true}));await wait();assert(currentNote().notebookId===first,'Mudar associação move a nota');
  document.querySelector('[data-view=notebooks]').click();await wait();document.querySelector(`[data-remove-book="${book}"]`).click();$('#notebook-transfer').value=first;$('#notebook-remove-form').requestSubmit();await wait();assert(!state.notebooks.some(item=>item.id===book),'Remover caderno pela gestão');
  $('#toast').hidden=true;
  return {errors:window.smokeErrors};
})()
