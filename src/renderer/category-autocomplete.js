// Existing categories, suggested at the caret without taking focus from writing.
let categoryCompletion=null,categoryCompletionIndex=0,categoryCompletionFrame=0,categoryCompletionComposing=false;
const categorySuggestions=document.createElement('div');
categorySuggestions.id='category-suggestions';categorySuggestions.className='category-suggestions';
categorySuggestions.hidden=true;categorySuggestions.setAttribute('role','listbox');categorySuggestions.setAttribute('aria-label','Sugestões de categorias');
document.body.append(categorySuggestions);
const categorySearchKey=value=>value.normalize('NFD').replace(/\p{M}/gu,'').toLocaleLowerCase('pt-BR');
function categoryCompletionContext(){
 const focused=document.activeElement;
 if(!currentNote()||!focused)return null;
 let element,text,offset;
 if(focused.matches('textarea#note-body,#task-input,[data-item-text]')){
  if(focused.selectionStart!==focused.selectionEnd)return null;
  element=focused;text=element.value;offset=element.selectionStart;
 }else if(focused.closest('#note-body')){
  const selection=getSelection();if(!selection.rangeCount||!selection.isCollapsed)return null;
  const anchor=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement;
  element=anchor.closest('.line-text');
  if(!element||element.closest('[data-block-type=code]')||anchor.closest('code'))return null;
  text=element.textContent;offset=caretOffset(element);
 }else return null;
 const token=categoryText.tokens(text).find(token=>offset>token.start+1&&offset<=token.end);
 if(!token)return null;
 const query=categorySearchKey(text.slice(token.start+1,offset));
 const matches=state.categories.filter(category=>categorySearchKey(category.name).startsWith(query)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR')).slice(0,6);
 return matches.length?{element,text,offset,token,matches,noteId:currentNote().id}:null;
}
function closeCategorySuggestions(){
 const element=categoryCompletion?.element;
 for(const attribute of ['aria-controls','aria-expanded','aria-activedescendant','aria-autocomplete'])element?.removeAttribute(attribute);
 categorySuggestions.hidden=true;categorySuggestions.classList.remove('category-bounce');categoryCompletion=null;
}
function categoryCaretRect(context){
 if(context.element.isContentEditable){
  const range=getSelection().getRangeAt(0).cloneRange();range.collapse(true);
  const rect=range.getClientRects()[0];return rect?.height?rect:context.element.getBoundingClientRect();
 }
 const element=context.element,rect=element.getBoundingClientRect(),style=getComputedStyle(element),mirror=document.createElement('div');
 for(const property of ['font','lineHeight','letterSpacing','padding','borderWidth','boxSizing','wordSpacing','tabSize'])mirror.style[property]=style[property];
 Object.assign(mirror.style,{position:'fixed',visibility:'hidden',left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',whiteSpace:element.tagName==='INPUT'?'pre':'pre-wrap',overflowWrap:'break-word',borderStyle:'solid'});
 mirror.textContent=context.text.slice(0,context.offset);const marker=document.createElement('span');marker.textContent='\u200b';mirror.append(marker);document.body.append(mirror);
 const caret=marker.getBoundingClientRect();const result={left:caret.left-element.scrollLeft,bottom:caret.bottom-element.scrollTop,top:caret.top-element.scrollTop};mirror.remove();return result;
}
function positionCategorySuggestions(){
 if(!categoryCompletion)return;
 const rect=categoryCaretRect(categoryCompletion),height=categorySuggestions.offsetHeight,width=categorySuggestions.offsetWidth;
 const top=rect.bottom+8+height<=innerHeight-12?rect.bottom+8:Math.max(12,rect.top-height-8);
 categorySuggestions.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';categorySuggestions.style.top=top+'px';
}
function selectCategorySuggestion(index){
 categoryCompletionIndex=index;
 [...categorySuggestions.querySelectorAll('[role=option]')].forEach((button,i)=>{button.setAttribute('aria-selected',String(i===index));});
 categoryCompletion?.element.setAttribute('aria-activedescendant','category-suggestion-'+index);
}
function refreshCategorySuggestions(){
 if(categoryCompletionComposing){closeCategorySuggestions();return;}
 const context=categoryCompletionContext();if(!context){closeCategorySuggestions();return;}
 const opening=categorySuggestions.hidden;
 categoryCompletion=context;categoryCompletionIndex=0;
 categorySuggestions.innerHTML=context.matches.map((category,i)=>`<button type="button" role="option" id="category-suggestion-${i}" data-category-index="${i}" tabindex="-1">#${escape(category.name)}</button>`).join('')+'<small>↑ ↓ escolher · Enter ou Tab inserir · Esc fechar</small>';
 categorySuggestions.hidden=false;
 context.element.setAttribute('aria-controls',categorySuggestions.id);context.element.setAttribute('aria-expanded','true');context.element.setAttribute('aria-autocomplete','list');selectCategorySuggestion(0);
 if(opening)categorySuggestions.classList.add('category-bounce');positionCategorySuggestions();
}
function requestCategorySuggestions(){cancelAnimationFrame(categoryCompletionFrame);categoryCompletionFrame=requestAnimationFrame(refreshCategorySuggestions);}
function acceptCategorySuggestion(index){
 const context=categoryCompletion,fresh=categoryCompletionContext();
 if(!context||!fresh||fresh.element!==context.element||fresh.text!==context.text||fresh.offset!==context.offset||fresh.noteId!==context.noteId){closeCategorySuggestions();return;}
 const category=context.matches[index];if(!category)return;
 const {element,text,token}=context,replacement='#'+category.name+(text[token.end]?.match(/\s/)?'':' ');
 closeCategorySuggestions();
 if(element.isContentEditable){
  capturePageSelection();
  const runs=readInlineRuns(element),marks=sliceInlineRuns(runs,token.start,token.start+1)[0]?.marks||{};
  renderInlineRuns(element,[...sliceInlineRuns(runs,0,token.start),{text:replacement,marks},...sliceInlineRuns(runs,token.end,text.length)]);
  putCaret(element,token.start+replacement.length);unfinishedCategoryNote=null;
 }else{element.setRangeText(replacement,token.start,token.end,'end');element.focus();}
 element.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:replacement}));
}
categorySuggestions.onpointerdown=event=>event.preventDefault();
categorySuggestions.onclick=event=>{const button=event.target.closest('[data-category-index]');if(button)acceptCategorySuggestion(Number(button.dataset.categoryIndex));};
document.addEventListener('input',event=>{if(!event.isComposing)requestCategorySuggestions();else closeCategorySuggestions();});
document.addEventListener('compositionstart',()=>{categoryCompletionComposing=true;cancelAnimationFrame(categoryCompletionFrame);closeCategorySuggestions();});
document.addEventListener('compositionend',()=>{categoryCompletionComposing=false;requestCategorySuggestions();});
document.addEventListener('keydown',event=>{
 if(categorySuggestions.hidden||event.isComposing||event.metaKey||event.ctrlKey||event.altKey)return;
 if(!['ArrowDown','ArrowUp','Enter','Tab','Escape'].includes(event.key))return;
 event.preventDefault();event.stopImmediatePropagation();
 if(event.key==='Escape'){cancelAnimationFrame(categoryCompletionFrame);closeCategorySuggestions();return;}
 if(event.key==='Enter'||event.key==='Tab'){acceptCategorySuggestion(categoryCompletionIndex);return;}
 selectCategorySuggestion((categoryCompletionIndex+(event.key==='ArrowDown'?1:-1)+categoryCompletion.matches.length)%categoryCompletion.matches.length);
},true);
document.addEventListener('selectionchange',()=>{if(!categorySuggestions.hidden)requestCategorySuggestions();});
document.addEventListener('focusout',()=>{cancelAnimationFrame(categoryCompletionFrame);closeCategorySuggestions();});
document.addEventListener('pointerdown',event=>{if(!categorySuggestions.contains(event.target)){cancelAnimationFrame(categoryCompletionFrame);closeCategorySuggestions();}},true);
document.addEventListener('scroll',()=>{if(!categorySuggestions.hidden)positionCategorySuggestions();},true);
window.addEventListener('resize',closeCategorySuggestions);
