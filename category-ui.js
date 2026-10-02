function renderCategoryBadges() {
  const region=$('#category-badges'), note=currentNote(); if(!region||!note) return;
  region.innerHTML=note.categories.map(category=>`<span class="category-badge" title="${category.sources.includes('inline')?'Também usada no texto. Apague a hashtag para remover essa associação.':'Categoria escolhida para esta página.'}"><span>#${escape(category.name)}</span>${category.sources.includes('manual')?`<button data-remove-category="${escape(category.id)}" aria-label="Remover categoria ${escape(category.name)}">×</button>`:''}</span>`).join('')+'<button id="add-category" class="category-add">+ Categoria</button>';
  $('#add-category').onclick=openCategoryDialog;
  region.querySelectorAll('[data-remove-category]').forEach(button=>button.onclick=()=>action('category:detach',{noteId:note.id,categoryId:button.dataset.removeCategory}));
}
let categoryTarget=null;
function openCategoryDialog() {
  categoryTarget=currentNote().id;
  $('#category-error').hidden=true;
  $('#category-name').value=''; renderCategoryChoices(); $('#category-dialog').showModal(); $('#category-name').focus();
}
function renderCategoryChoices() {
  const query=$('#category-name').value.replace(/^#/,'').trim().toLocaleLowerCase('pt-BR');
  const attached=state.notes.find(note=>note.id===categoryTarget)?.categories||[];
  const matches=state.categories.filter(category=>category.key.includes(query));
  $('#category-choices').innerHTML=matches.length?matches.map(category=>`<button type="button" data-use-category="${escape(category.id)}" ${attached.some(item=>item.id===category.id&&item.sources.includes('manual'))?'disabled':''}>#${escape(category.name)}</button>`).join(''):'<p>Nenhuma categoria cadastrada com esse nome.</p>';
  $('#category-choices').querySelectorAll('[data-use-category]').forEach(button=>button.onclick=async()=>{ if(await action('category:attach',{noteId:categoryTarget,categoryId:button.dataset.useCategory})) $('#category-dialog').close(); });
}
$('#category-close').onclick=()=>$('#category-dialog').close();
$('#category-name').oninput=()=>{$('#category-error').hidden=true;renderCategoryChoices();};
$('#category-form').onsubmit=async event=>{
  event.preventDefault(); let name;
  try{name=categoryText.normalize($('#category-name').value).name;}
  catch(error){$('#category-error').textContent=error.message;$('#category-error').hidden=false;return;}
  if(await action('category:attach',{noteId:categoryTarget,name})) $('#category-dialog').close();
  else{$('#category-error').textContent='Não foi possível guardar a categoria. Tente novamente.';$('#category-error').hidden=false;}
};

function highlightCategoryTokens(span) {
  const text=span.innerText.replace(/\n$/,''), tokens=categoryText.tokens(text);
  if(!tokens.length && !span.querySelector('.inline-category')) return;
  const focused=span.contains(getSelection().anchorNode), offset=focused?caretOffset(span):0;
  const fragment=document.createDocumentFragment(); let previous=0;
  for(const token of tokens) {
    fragment.append(document.createTextNode(text.slice(previous,token.start)));
    const pill=document.createElement('span'); pill.className='inline-category'; pill.textContent=text.slice(token.start,token.end); fragment.append(pill); previous=token.end;
  }
  fragment.append(document.createTextNode(text.slice(previous))); span.replaceChildren(fragment);
  if(!text) span.append(document.createElement('br'));
  if(focused) putCaret(span,offset);
}
let unfinishedCategoryNote=null;
let transformingCategoryEditor=false;
function categoryCursorFor(event,editor) {
  if(!event?.isTrusted) return null;
  if(!event.isComposing && !(event.inputType?.startsWith('delete') || (event.data?.length===1 && /[\p{L}\p{N}_#-]/u.test(event.data)))) return null;
  if(['TEXTAREA','INPUT'].includes(editor.tagName)) return editor.selectionStart;
  const lines=[...editor.querySelectorAll('.writing-line')], line=getSelection().anchorNode?.parentElement?.closest('.writing-line');
  if(!line) return null;
  return lines.slice(0,lines.indexOf(line)).reduce((size,item)=>size+readWritingLine(item).length+1,0)+caretOffset(editableText(line))+(line.dataset.checkbox?4:0);
}
document.addEventListener('focusout',event=>{
  if(transformingCategoryEditor || !unfinishedCategoryNote || !event.target.closest('#note-body') || event.relatedTarget?.closest('#note-body')) return;
  const id=unfinishedCategoryNote; unfinishedCategoryNote=null;
  if(currentNote()?.id===id && $('#note-body')) action('note:update',{id,body:$('#note-body').value},{history:false});
});
document.addEventListener('compositionend',event=>{ if(view==='notes'&&event.target.closest('#note-body')) smartNoteInput(currentNote().id,event); });

// A category is removed as one unit, while surrounding prose keeps normal editing.
function eraseCategoryPill(event) {
  if(view!=='notes' || event.isComposing) return;
  const span=event.target.closest('.line-text'); if(!span) return;
  const selection=getSelection();if(!selection.isCollapsed || !span.contains(selection.anchorNode)) return;
  const offset=caretOffset(span),text=span.innerText.replace(/\n$/,'');
  let position=0,token;
  for(const node of span.childNodes) {
    const length=node.textContent.length;
    if(node.nodeType===1 && node.classList.contains('inline-category') && offset>position && offset<=position+length) {token={start:position,end:position+length};break;}
    position+=length;
  }
  if(!token) return;
  event.preventDefault();event.stopImmediatePropagation();capturePageSelection();unfinishedCategoryNote=null;
  span.textContent=text.slice(0,token.start)+text.slice(token.end); if(!span.textContent) span.append(document.createElement('br'));
  highlightCategoryTokens(span);putCaret(span,token.start);
  smartNoteInput(currentNote().id,{target:span,isTrusted:false});
}
document.addEventListener('keydown',event=>{if(event.key==='Backspace' && !event.altKey) eraseCategoryPill(event);},true);
document.addEventListener('beforeinput',event=>{if(event.inputType==='deleteContentBackward') eraseCategoryPill(event);},true);
