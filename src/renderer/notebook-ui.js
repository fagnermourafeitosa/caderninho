let notebookEditing=null,notebookRemoving=null;
const notebookColorNames=['Mel','Sálvia','Pêssego','Azul névoa','Lavanda','Rosa'];
function renderNotebookTabs() {
  const region=$('#notebook-tabs');
  region.innerHTML=state.notebooks.map(book=>`<button class="notebook-tab ${book.id===state.activeNotebook?'selected':''}" data-book-tab="${escape(book.id)}" style="--book-color:${book.color}" aria-label="Abrir caderno ${escape(book.name)}" aria-pressed="${book.id===state.activeNotebook}" title="${escape(book.name)}"><span>${escape(book.name)}</span></button>`).join('')+'<button class="notebook-tab notebook-tab-add" id="notebook-tab-add" aria-label="Novo caderno" title="Novo caderno"><b>+</b><span>Novo caderno</span></button>';
  region.querySelectorAll('[data-book-tab]').forEach(button=>button.onclick=()=>openNotebook(button.dataset.bookTab));
  $('#notebook-tab-add').onclick=()=>openNotebookDialog();
}
async function openNotebook(id) {
  cancelTurn();
  if(!await action('notebook:select',{id})) return;
  if(!['notes','tasks','reminders','boards'].includes(view)) {if(!await action('view:select',{view:'notes'})) return;}
  view=state.activeView; reminderEditor=false; render();
}
function notebookAssociation(note) {
  return `<label class="notebook-association"><select id="note-notebook" aria-label="Caderno desta página">${state.notebooks.map(book=>`<option value="${escape(book.id)}" ${note.notebookId===book.id?'selected':''}>${escape(book.name)}</option>`).join('')}</select></label>`;
}
function wireNotebookAssociation(note) {
  $('#note-notebook').onchange=async event=>{if(await action('note:move',{id:note.id,notebookId:event.target.value})) {render();}};
}
function renderNotebooks() {
  $('#list-progress').hidden=true;
  $('#page-content').innerHTML=`<div class="view-toolbar"><span class="toolbar-left"></span><span class="toolbar-right"><button id="notebook-new" class="add-note toolbar-action toolbar-primary" aria-label="Novo caderno" title="Novo caderno">${icon('add')}<span class="toolbar-action-label">Novo caderno</span></button></span></div><h1>Cadernos</h1><p class="view-description">Organize suas notas, listas e lembretes. Cada página pertence a um caderno.</p><div class="notebook-list scroll-list">`+state.notebooks.map(book=>`<article class="notebook-row"><button class="notebook-cover" data-open-book="${escape(book.id)}" style="--book-color:${book.color}" aria-label="Abrir caderno ${escape(book.name)}"><span>${escape(book.name)}</span></button><div class="notebook-copy"><h2>${escape(book.name)}${book.id===state.activeNotebook?'<small>Em uso</small>':''}</h2><p>${escape(book.description || 'Sem descrição')}</p><small>${book.count} ${book.count===1?'página':'páginas'} · Atualizado em ${formatDateTime(book.updated)}</small><div class="notebook-actions"><button data-open-book="${escape(book.id)}">${actionLabel('open','Abrir')}</button><button data-edit-book="${escape(book.id)}">${actionLabel('edit','Editar')}</button><button data-remove-book="${escape(book.id)}" ${state.notebooks.length===1?'disabled title="Mantenha pelo menos um caderno"':''}>${actionLabel('trash','Remover')}</button></div></div></article>`).join('')+'</div>';
  $('#notebook-new').onclick=()=>openNotebookDialog();
  $('#page-content').querySelectorAll('[data-open-book]').forEach(button=>button.onclick=()=>openNotebook(button.dataset.openBook));
  $('#page-content').querySelectorAll('[data-edit-book]').forEach(button=>button.onclick=()=>openNotebookDialog(button.dataset.editBook));
  $('#page-content').querySelectorAll('[data-remove-book]').forEach(button=>button.onclick=()=>openNotebookRemoval(button.dataset.removeBook));
}
function openNotebookDialog(id=null) {
  const book=state.notebooks.find(book=>book.id===id);notebookEditing=book?.id||null;
  $('#notebook-dialog-title').textContent=book?'Editar caderno':'Novo caderno';
  $('#notebook-name').value=book?.name||'';$('#notebook-description').value=book?.description||'';$('#notebook-error').hidden=true;
  const color=book?.color||state.notebookColors[state.notebooks.length%state.notebookColors.length];
  $('#notebook-colors').innerHTML=state.notebookColors.map((value,index)=>`<label class="notebook-swatch" style="--book-color:${value}" title="${notebookColorNames[index]}"><input type="radio" name="notebook-color" value="${value}" ${value===color?'checked':''} required aria-label="${notebookColorNames[index]}"><span aria-hidden="true">✓</span></label>`).join('');
  $('#notebook-dialog').showModal();$('#notebook-name').focus();
}
$('#notebook-close').onclick=()=>$('#notebook-dialog').close();
$('#notebook-form').onsubmit=async event=>{
  event.preventDefault();const input={name:$('#notebook-name').value,description:$('#notebook-description').value,color:$('#notebook-colors input:checked').value};
  if(notebookEditing) input.id=notebookEditing;
  if(await action(notebookEditing?'notebook:update':'notebook:create',input)) {$('#notebook-dialog').close();render();}
  else {$('#notebook-error').textContent='Não foi possível guardar. Confira o nome e tente novamente.';$('#notebook-error').hidden=false;}
};
function openNotebookRemoval(id) {
  notebookRemoving=id;const book=state.notebooks.find(book=>book.id===id);
  $('#notebook-remove-copy').textContent=`Remover “${book.name}”? Escolha onde guardar suas páginas.`;
  $('#notebook-transfer').innerHTML=state.notebooks.filter(book=>book.id!==id).map(book=>`<option value="${escape(book.id)}">${escape(book.name)}</option>`).join('');
  $('#notebook-remove-dialog').showModal();
}
$('#notebook-remove-close').onclick=()=>$('#notebook-remove-dialog').close();
$('#notebook-remove-form').onsubmit=async event=>{
  event.preventDefault();if(await action('notebook:remove',{id:notebookRemoving,targetId:$('#notebook-transfer').value})) {$('#notebook-remove-dialog').close();render();toast('Páginas transferidas. Caderno removido.');}
};
