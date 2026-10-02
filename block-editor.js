const blockLabels={paragraph:'Texto',h1:'Título grande',h2:'Título médio',h3:'Título pequeno',check:'Checkbox',bullet:'Lista com marcadores',number:'Lista numerada',quote:'Citação',divider:'Divisor',code:'Código',table:'Tabela',media:'Imagem ou link'};
let insertionContext=null,formatRange=null;
function sliceInlineRuns(runs,start,end){let offset=0,result=[];for(const run of runs){const a=Math.max(start,offset),b=Math.min(end,offset+run.text.length);if(b>a)result.push({...run,text:run.text.slice(a-offset,b-offset)});offset+=run.text.length;}return result;}
function colorValue(value){const probe=document.createElement('span');probe.style.color=value;return probe.style.color;}
function readInlineRuns(element){
  const result=[];
  function visit(node,marks){
    if(node.nodeType===3){if(node.textContent)result.push({text:node.textContent,marks:{...marks}});return;}
    if(node.nodeType!==1)return;
    if(node.tagName==='BR'){if(node.parentNode.childNodes.length>1)result.push({text:'\n',marks:{...marks}});return;}
    const next={...marks};
    const tags={B:'bold',STRONG:'bold',I:'italic',EM:'italic',U:'underline',S:'strike',STRIKE:'strike',CODE:'code'};
    if(tags[node.tagName])next[tags[node.tagName]]=true;
    if(node.tagName==='A'){const href=pageDocument.link(node.getAttribute('href'));if(href)next.link=href;}
    const highlight=pageDocument.COLORS.find(color=>colorValue(color)===colorValue(node.dataset.highlight||node.style.backgroundColor));if(highlight)next.highlight=highlight;
    for(const child of node.childNodes)visit(child,next);
  }
  for(const child of element.childNodes)visit(child,{});
  if(!result.length)return pageDocument.plainRuns('');
  // Browser editing sometimes leaves a terminal BR in otherwise plain lines.
  if(result.at(-1).text==='\n')result.pop();
  return result.length?result:pageDocument.plainRuns('');
}
function renderInlineRuns(span,runs){
  const text=pageDocument.runText(runs),tokens=(span.closest('[data-block-type=code]')?[]:categoryText.tokens(text)).filter(token=>!runs.some((run,index)=>{const start=runs.slice(0,index).reduce((n,value)=>n+value.text.length,0);return run.marks.code&&token.start>=start&&token.start<start+run.text.length;}));
  const fragment=document.createDocumentFragment();
  function segment(start,end,parent){let at=0;for(const run of runs){const a=Math.max(start,at),b=Math.min(end,at+run.text.length);if(b>a){let element=document.createTextNode(run.text.slice(a-at,b-at));for(const [mark,tag] of [['code','code'],['bold','strong'],['italic','em'],['underline','u'],['strike','s']])if(run.marks[mark]){const wrap=document.createElement(tag);wrap.append(element);element=wrap;}if(run.marks.highlight){const wrap=document.createElement('mark');wrap.dataset.highlight=run.marks.highlight;wrap.style.backgroundColor=run.marks.highlight;wrap.append(element);element=wrap;}if(run.marks.link){const wrap=document.createElement('a');wrap.href=run.marks.link;wrap.append(element);element=wrap;}parent.append(element);}at+=run.text.length;}}
  let at=0;for(const token of tokens){segment(at,token.start,fragment);const pill=document.createElement('span');pill.className='inline-category';segment(token.start,token.end,pill);fragment.append(pill);at=token.end;}segment(at,text.length,fragment);span.replaceChildren(fragment);if(!text)span.append(document.createElement('br'));
}
function readEditorBlock(line){
  const type=line.dataset.checkbox?'check':line.dataset.blockType||'paragraph',id=line.dataset.blockId||(line.dataset.blockId=pageDocument.id());
  if(type==='table')return {id,type,header:line.dataset.header!=='false',rows:[...line.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('.table-cell-text')].map(readInlineRuns))};
  return {id,type,checked:line.dataset.checked==='true',runs:type==='divider'?[]:readInlineRuns(editableText(line))};
}
function readEditorDocument(){return [...$('#note-body').querySelectorAll('.writing-line')].map(readEditorBlock);}
function renderDocumentBlock(block,index){
  if(block.type==='table'){
    const outer=document.createElement('div');outer.className='writing-line table-block';outer.contentEditable='false';outer.dataset.blockType='table';outer.dataset.blockId=block.id;outer.dataset.lineIndex=index;outer.dataset.header=block.header;
    const table=document.createElement('table');table.className='paper-table';table.style.minWidth=Math.max(320,block.rows[0].length*90)+'px';const tbody=document.createElement('tbody');
    block.rows.forEach((cells,r)=>{const row=document.createElement('tr');cells.forEach((runs,c)=>{const cell=document.createElement(r===0&&block.header?'th':'td'),span=document.createElement('div');span.className='line-text table-cell-text';span.contentEditable='true';span.setAttribute('role','textbox');span.setAttribute('aria-label',`Tabela, linha ${r+1}, coluna ${c+1}`);span.dataset.row=r;span.dataset.column=c;renderInlineRuns(span,runs);cell.append(span);row.append(cell);});tbody.append(row);});table.append(tbody);outer.append(table);
    const tools=document.createElement('div');tools.className='table-tools';tools.innerHTML='<button type="button" data-table-action="row">+ Linha</button><button type="button" data-table-action="column">+ Coluna</button><button type="button" data-table-action="header">Cabeçalho</button><button type="button" data-table-action="remove">Remover tabela</button>';
    tools.querySelectorAll('button').forEach(button=>button.onclick=()=>changeTable(outer,button.dataset.tableAction));outer.append(tools);return outer;
  }
  const line=makeWritingLine(block.type==='check'?`[${block.checked?'x':' '}] `+pageDocument.runText(block.runs):pageDocument.runText(block.runs),index);
  line.dataset.blockType=block.type;line.dataset.blockId=block.id;line.classList.add('block-'+block.type);
  renderInlineRuns(editableText(line),block.runs);if(block.type==='code')editableText(line).spellcheck=false;
  if(block.type==='divider'){line.classList.add('block-divider');editableText(line).contentEditable='false';editableText(line).setAttribute('role','separator');}
  return line;
}
function renderDocumentBlocks(editor,note){let offset=0;note.editorDoc.forEach((block,i)=>{const size=pageDocument.blockText(block).split('\n').length;note.cuts.filter(cut=>Math.min(cut.anchor,note.body.split('\n').length-1)>=offset&&Math.min(cut.anchor,note.body.split('\n').length-1)<offset+size).forEach(cut=>editor.append(cutCard(cut)));editor.append(renderDocumentBlock(block,offset));offset+=size;});editor.dataset.structured='true';}
function ensureRichEditor(){
  const old=$('#note-body');if(!old)return null;if(old.dataset.structured==='true')return old;
  let line=0,start=0,end=0;
  if(old.tagName==='TEXTAREA'){const before=old.value.slice(0,old.selectionStart);line=before.split('\n').length-1;start=before.split('\n').at(-1).length;end=start+(old.selectionEnd-old.selectionStart);}
  else{const selected=getSelection().anchorNode?.parentElement?.closest('.writing-line');line=[...old.querySelectorAll('.writing-line')].indexOf(selected);start=selected?caretOffset(editableText(selected)):0;end=selected?caretOffset(editableText(selected),true):start;}
  const doc=old.tagName==='TEXTAREA'?pageDocument.fromPlain(old.value):readEditorDocument();transformingCategoryEditor=true;
  try{mountCollage({...currentNote(),body:old.value,editorDoc:doc});const span=editableText($('#note-body').querySelectorAll('.writing-line')[Math.max(0,line)]);putCaret(span,start);if(end>start){const range=getSelection().getRangeAt(0);const walker=document.createTreeWalker(span,NodeFilter.SHOW_TEXT);let node,remaining=end;while((node=walker.nextNode())){if(remaining<=node.length){range.setEnd(node,remaining);break;}remaining-=node.length;}}}finally{transformingCategoryEditor=false;}
  return $('#note-body');
}
function saveDocument(group=false){const editor=$('#note-body');reindexDocument();updateDetail();renderSmartMargin();const doc=readEditorDocument();return action('note:update',{id:currentNote().id,body:pageDocument.text(doc),editorDoc:doc},{group});}
function reindexDocument(){let at=0;$('#note-body')?.querySelectorAll('.writing-line').forEach(line=>{line.dataset.lineIndex=at;at+=readWritingLine(line).split('\n').length;});}
function replaceDocument(doc,focusIndex=0){const note={...currentNote(),editorDoc:doc,body:pageDocument.text(doc)};mountCollage(note);const line=$('#note-body').querySelectorAll('.writing-line')[focusIndex];if(line)putCaret(editableText(line));return saveDocument();}
function popupPosition(menu,rect){menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-menu.offsetWidth-12))+'px';menu.style.top=Math.max(12,Math.min(rect.bottom+6,innerHeight-menu.offsetHeight-12))+'px';}
function hideEditorMenus(){ $('#block-menu').hidden=true;$('#format-menu').hidden=true;insertionContext=null; }
function openInsertMenu(line=null,slash=null){
  const editor=ensureRichEditor();if(!editor)return;
  line=line||getSelection().anchorNode?.parentElement?.closest('.writing-line')||editor.querySelector('.writing-line');
  insertionContext={line,slash};$('#format-menu').hidden=true;const menu=$('#block-menu');menu.hidden=false;menu.onpointerup=null;menu.onkeydown=null;
  const query=slash?.query?.toLocaleLowerCase('pt-BR')||'';
  menu.innerHTML='<small>Inserir na página</small>'+Object.entries(blockLabels).filter(([key,label])=>label.toLocaleLowerCase('pt-BR').includes(query)).map(([type,label])=>`<button type="button" role="menuitem" data-insert-block="${type}">${label}${type==='table'?'<span>▦</span>':''}</button>`).join('');
  menu.onpointerdown=event=>event.preventDefault();menu.querySelectorAll('[data-insert-block]').forEach(button=>button.onclick=()=>button.dataset.insertBlock==='table'?showTablePicker():insertEditorBlock(button.dataset.insertBlock));
  popupPosition(menu,line.getBoundingClientRect());
}
function removeSlash(){const ctx=insertionContext;if(!ctx?.slash)return;const span=editableText(ctx.line),runs=readInlineRuns(span);const start=ctx.slash.start,end=ctx.slash.end;let offset=0;const next=[];for(const run of runs){const before=run.text.slice(0,Math.max(0,start-offset)),after=run.text.slice(Math.max(0,end-offset));if(offset+run.text.length<=start||offset>=end)next.push(run);else {if(before)next.push({...run,text:before});if(after)next.push({...run,text:after});}offset+=run.text.length;}renderInlineRuns(span,next);}
function insertEditorBlock(type,rows=0,columns=0){
  const context=insertionContext;if(!context)return;capturePageSelection();removeSlash();
  if(type==='media'){hideEditorMenus();saveDocument();openCutDialog();return;}
  const editor=$('#note-body'),lines=[...editor.querySelectorAll('.writing-line')],index=lines.indexOf(context.line),doc=readEditorDocument();
  const block=type==='table'?{id:pageDocument.id(),type,header:true,rows:Array.from({length:rows},()=>Array.from({length:columns},()=>pageDocument.plainRuns('')))}:{id:pageDocument.id(),type,checked:false,runs:pageDocument.plainRuns('')};
  const empty=doc[index]?.type==='paragraph'&&!pageDocument.runText(doc[index].runs);
  if(empty)doc.splice(index,1,block);else doc.splice(index+1,0,block);
  const next=empty?index:index+1;if(['table','divider'].includes(type)&&next===doc.length-1)doc.push({id:pageDocument.id(),type:'paragraph',runs:pageDocument.plainRuns('')});
  hideEditorMenus();replaceDocument(doc,type==='divider'?Math.min(next+1,doc.length-1):next);
}
function showTablePicker(){
  const menu=$('#block-menu');menu.innerHTML='<small>Tabela</small><strong id="table-size" role="status">Escolha colunas × linhas</strong><div class="table-picker" role="group" aria-label="Escolher tamanho da tabela"></div><small>Passe o mouse ou arraste e solte para inserir.</small>';
  const grid=menu.querySelector('.table-picker');let pressed=false,chosen=null;
  function preview(rows,columns){chosen={rows,columns};$('#table-size').textContent=`${columns} colunas × ${rows} linhas`;grid.querySelectorAll('button').forEach(cell=>cell.classList.toggle('chosen',Number(cell.dataset.row)<=rows&&Number(cell.dataset.column)<=columns));}
  for(let row=1;row<=8;row++)for(let column=1;column<=8;column++){const cell=document.createElement('button');cell.type='button';cell.dataset.row=row;cell.dataset.column=column;cell.setAttribute('aria-label',`${column} colunas e ${row} linhas`);cell.onpointerenter=()=>preview(row,column);cell.onfocus=()=>preview(row,column);cell.onpointerdown=event=>{event.preventDefault();pressed=true;preview(row,column);};cell.onclick=()=>{if(insertionContext)insertEditorBlock('table',row,column);};grid.append(cell);}
  menu.onpointerup=()=>{if(pressed&&chosen){pressed=false;insertEditorBlock('table',chosen.rows,chosen.columns);}};
  const keyHandler=event=>{if(!insertionContext)return;let {rows,columns}=chosen||{rows:1,columns:1};if(event.key==='ArrowRight')columns=Math.min(8,columns+1);else if(event.key==='ArrowLeft')columns=Math.max(1,columns-1);else if(event.key==='ArrowDown')rows=Math.min(8,rows+1);else if(event.key==='ArrowUp')rows=Math.max(1,rows-1);else if(event.key==='Enter'){event.preventDefault();insertEditorBlock('table',rows,columns);return;}else return;event.preventDefault();preview(rows,columns);};menu.onkeydown=keyHandler;
  popupPosition(menu,insertionContext.line.getBoundingClientRect());menu.tabIndex=0;menu.focus({preventScroll:true});
}
function changeTable(line,actionName){
  capturePageSelection();const index=[...$('#note-body').querySelectorAll('.writing-line')].indexOf(line),doc=readEditorDocument(),block=doc[index];
  if(actionName==='row'){if(block.rows.length>=20)return toast('A tabela pode ter até 20 linhas.');block.rows.push(Array.from({length:block.rows[0].length},()=>pageDocument.plainRuns('')));}
  if(actionName==='column'){if(block.rows[0].length>=20)return toast('A tabela pode ter até 20 colunas.');block.rows.forEach(row=>row.push(pageDocument.plainRuns('')));}
  if(actionName==='header')block.header=!block.header;
  if(actionName==='remove')doc.splice(index,1);
  if(!doc.length)doc.push({id:pageDocument.id(),type:'paragraph',runs:pageDocument.plainRuns('')});replaceDocument(doc,Math.min(index,doc.length-1));
}
function tableKey(event){const cell=event.target.closest('.table-cell-text');if(!cell)return false;if(event.key==='Enter'){event.preventDefault();document.execCommand('insertLineBreak');return true;}if(event.key!=='Tab')return false;event.preventDefault();const line=cell.closest('.table-block'),cells=[...line.querySelectorAll('.table-cell-text')],index=cells.indexOf(cell);let next=cells[index+(event.shiftKey?-1:1)];if(!next&&!event.shiftKey){changeTable(line,'row');next=$('#note-body').querySelector(`[data-block-id="${line.dataset.blockId}"]`)?.querySelectorAll('.table-cell-text')[index+1];}if(next)putCaret(next);return true;}
function detectSlash(event){if(event.isComposing||view!=='notes')return;const editor=$('#note-body');if(!editor)return;if(editor.tagName==='TEXTAREA'){const before=editor.value.slice(0,editor.selectionStart);if(/(?:^|\s)\/[^\s/]*$/.test(before))ensureRichEditor();else return;}
  const span=getSelection().anchorNode?.parentElement?.closest('.line-text');if(!span||span.closest('.table-block')||span.closest('[data-block-type=code]'))return;const end=caretOffset(span),before=span.textContent.slice(0,end),match=before.match(/(?:^|\s)(\/[^\s/]*)$/);if(match)openInsertMenu(span.closest('.writing-line'),{start:end-match[1].length,end,query:match[1].slice(1)});else if(insertionContext?.slash)hideEditorMenus();
}
function showFormatMenu(){
  const menu=$('#format-menu');if(view!=='notes'||!currentNote()||$('#block-menu').hidden===false||document.querySelector('dialog[open]'))return;
  const selection=getSelection(),span=selection.anchorNode?.parentElement?.closest('.line-text');
  if(!span||!span.closest('#note-body')||selection.isCollapsed||!span.contains(selection.focusNode)){menu.hidden=true;return;}
  formatRange=selection.getRangeAt(0).cloneRange();menu.innerHTML=[['bold','B','Negrito'],['italic','I','Itálico'],['underline','U','Sublinhado'],['strikeThrough','S','Tachado'],['code','</>','Código'],['link','↗','Link'],['highlight','▰','Marca-texto']].map(([command,label,title])=>`<button type="button" data-format="${command}" title="${title}" aria-label="${title}">${label}</button>`).join('');menu.hidden=false;menu.onpointerdown=event=>event.preventDefault();menu.querySelectorAll('button').forEach(button=>button.onclick=()=>formatSelection(button.dataset.format));const rect=formatRange.getBoundingClientRect();popupPosition(menu,rect);
}
function restoreFormatRange(){if(!formatRange)return;const selection=getSelection();selection.removeAllRanges();selection.addRange(formatRange);}
function formatSelection(command,value){
  ensureRichEditor();restoreFormatRange();capturePageSelection();
  if(command==='link'){ $('#editor-link-url').value='';$('#editor-link-dialog').showModal();$('#editor-link-url').focus();return;}
  if(command==='highlight'){const menu=$('#format-menu');menu.innerHTML=pageDocument.COLORS.map((color,i)=>`<button class="highlight-choice" style="background:${color}" aria-label="Marca-texto ${notebookColorNames[i]}" data-highlight="${color}"></button>`).join('')+'<button data-clear-highlight aria-label="Remover marca-texto">×</button>';menu.querySelectorAll('[data-highlight]').forEach(button=>button.onclick=()=>formatSelection('hiliteColor',button.dataset.highlight));menu.querySelector('[data-clear-highlight]').onclick=()=>formatSelection('hiliteColor','transparent');return;}
  if(command==='code'){const range=getSelection().getRangeAt(0);const code=document.createElement('code');code.append(range.extractContents());range.insertNode(code);range.selectNodeContents(code);getSelection().removeAllRanges();getSelection().addRange(range);}
  else document.execCommand(command,false,value||null);
  $('#format-menu').hidden=true;formatRange=null;saveDocument();
}
$('#editor-link-close').onclick=()=>$('#editor-link-dialog').close();
$('#editor-link-form').onsubmit=event=>{event.preventDefault();const url=pageDocument.link($('#editor-link-url').value);if(!url)return toast('Use um endereço HTTP ou HTTPS.');$('#editor-link-dialog').close();formatSelection('createLink',url);};
document.addEventListener('selectionchange',()=>{if($('#note-body')?.tagName!=='TEXTAREA')showFormatMenu();});
document.addEventListener('mouseup',event=>{const editor=$('#note-body');if(editor?.tagName==='TEXTAREA'&&event.target===editor&&editor.selectionStart!==editor.selectionEnd){ensureRichEditor();showFormatMenu();}});
document.addEventListener('input',event=>{if(event.target.closest('#note-body'))detectSlash(event);});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#block-menu,#format-menu,#add-block,dialog'))hideEditorMenus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')hideEditorMenus();});
document.addEventListener('click',event=>{const anchor=event.target.closest('#note-body a');if(anchor){event.preventDefault();if(event.ctrlKey||event.metaKey)window.notebook.openLink(anchor.href).catch(error=>toast(error.message));}});

document.addEventListener('keydown',event=>{
  if($('#block-menu').hidden||!insertionContext||$('#block-menu .table-picker'))return;
  const choices=[...$('#block-menu').querySelectorAll('[data-insert-block]')];if(!choices.length)return;
  const current=choices.findIndex(button=>button.classList.contains('keyboard-choice'));
  if(['ArrowDown','ArrowUp','Enter'].includes(event.key)){
    event.preventDefault();event.stopImmediatePropagation();
    if(event.key==='Enter'){(choices[Math.max(0,current)]).click();return;}
    choices.forEach(button=>button.classList.remove('keyboard-choice'));
    choices[(Math.max(-1,current)+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length].classList.add('keyboard-choice');
  }
},true);
