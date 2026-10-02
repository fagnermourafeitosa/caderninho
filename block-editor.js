const blockLabels={paragraph:'Texto',h1:'Título',h2:'Subtítulo',h3:'Título pequeno',quote:'Citação',check:'Tarefa',bullet:'Lista',number:'Lista numerada',divider:'Divisor',code:'Código',table:'Tabela',media:'Imagem ou link'};
const blockCommands=[
  ['paragraph','Texto','¶','parágrafo texto normal'],['h1','Texto','H1','título grande titulo 1'],['h2','Texto','H2','título médio titulo 2 subtítulo'],['h3','Texto','H3','título pequeno titulo 3'],['quote','Texto','quote','citação frase'],
  ['check','Listas','check','checkbox tarefa checklist'],['bullet','Listas','bullet','lista marcadores bullets'],['number','Listas','1.','lista numerada números'],
  ['divider','Estrutura','divider','divisor linha separador'],['code','Estrutura','code','código programação'],['table','Estrutura','table','tabela colunas linhas'],['media','Mídia','media','imagem link mídia adicionar recorte']
];
const commandPaths={quote:'M5 6h5v6H5z M14 6h5v6h-5z M10 12c0 4-2 6-5 6 M19 12c0 4-2 6-5 6',check:'M4 4h16v16H4z M8 12l3 3 6-7',bullet:'M9 6h11 M9 12h11 M9 18h11 M4 6h.1 M4 12h.1 M4 18h.1',divider:'M3 12h18',code:'M8 7l-5 5 5 5 M16 7l5 5-5 5 M14 4l-4 16',table:'M3 4h18v16H3z M3 10h18 M3 15h18 M9 4v16 M15 4v16',media:'M3 4h18v16H3z M3 17l6-6 4 4 3-3 5 5 M15 8h.1'};
function commandIcon(icon){return commandPaths[icon]?`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${commandPaths[icon]}"/></svg>`:icon;}
function commandSearch(text){return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR').trim();}
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
function readEditorDocument(){normalizePageDOM();return [...$('#note-body').querySelectorAll('.writing-line')].map(readEditorBlock);}
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
  if(block.type==='divider'){line.classList.add('block-divider');editableText(line).contentEditable='true';editableText(line).setAttribute('aria-label','Divisor');}
  return line;
}
function renderDocumentBlocks(editor,note){let offset=0;note.editorDoc.forEach((block,i)=>{const size=pageDocument.blockText(block).split('\n').length;note.cuts.filter(cut=>Math.min(cut.anchor,note.body.split('\n').length-1)>=offset&&Math.min(cut.anchor,note.body.split('\n').length-1)<offset+size).forEach(cut=>editor.append(cutCard(cut)));editor.append(renderDocumentBlock(block,offset));offset+=size;});editor.dataset.structured='true';}
function ensureRichEditor(){
  const old=$('#note-body');if(!old)return null;if(old.dataset.structured==='true')return old;
  const previousSelection=old.tagName==='TEXTAREA'?null:editorSelection();
  let line=0,start=0,end=0,endLine=0;
  if(old.tagName==='TEXTAREA'){const before=old.value.slice(0,old.selectionStart);line=before.split('\n').length-1;start=before.split('\n').at(-1).length;const after=old.value.slice(0,old.selectionEnd);endLine=after.split('\n').length-1;end=after.split('\n').at(-1).length;}
  else{const selected=getSelection().anchorNode?.parentElement?.closest('.writing-line');line=[...old.querySelectorAll('.writing-line')].indexOf(selected);start=selected?caretOffset(editableText(selected)):0;end=selected?caretOffset(editableText(selected),true):start;endLine=line;}
  const doc=old.tagName==='TEXTAREA'?pageDocument.fromPlain(old.value):readEditorDocument();transformingCategoryEditor=true;
  try{mountCollage({...currentNote(),body:old.value,editorDoc:doc});const lines=$('#note-body').querySelectorAll('.writing-line'),span=editableText(lines[Math.max(0,line)]);putCaret(span,start);if(endLine!==line||end>start){const range=getSelection().getRangeAt(0),point=editorTextPoint(editableText(lines[Math.max(0,endLine)]),end);range.setEnd(point.node,point.offset);}if(previousSelection)restoreEditorSelection(previousSelection);}finally{transformingCategoryEditor=false;}
  return $('#note-body');
}
function saveDocument(group=false){normalizePageDOM();const editor=$('#note-body');reindexDocument();updateDetail();renderSmartMargin();const doc=readEditorDocument();const noteId=currentNote().id;return action('note:update',{id:noteId,body:pageDocument.text(doc),editorDoc:doc},{group}).then(ok=>{if(ok&&view==='notes'&&currentNote()?.id===noteId&&!sourceDraft&&actionsForNote().length)renderSourceMargin();return ok;});}
function reindexDocument(){let at=0;$('#note-body')?.querySelectorAll('.writing-line').forEach(line=>{line.dataset.lineIndex=at;at+=readWritingLine(line).split('\n').length;});}
function replaceDocument(doc,focusIndex=0){const note={...currentNote(),editorDoc:doc,body:pageDocument.text(doc)};mountCollage(note);const line=$('#note-body').querySelectorAll('.writing-line')[focusIndex];if(line)putCaret(editableText(line));return saveDocument();}
function popupPosition(menu,rect){menu.style.left=Math.max(12,Math.min(rect.left,innerWidth-menu.offsetWidth-12))+'px';menu.style.top=Math.max(12,Math.min(rect.bottom+6,innerHeight-menu.offsetHeight-12))+'px';}
function hideEditorMenus(){ $('#block-menu').hidden=true;$('#format-menu').hidden=true;insertionContext=null; }
function selectCommand(button){
  const menu=$('#block-menu');menu.querySelectorAll('[data-insert-block]').forEach(choice=>{const selected=choice===button;choice.classList.toggle('keyboard-choice',selected);choice.setAttribute('aria-selected',selected);});
  const search=menu.querySelector('input');if(search){if(button)search.setAttribute('aria-activedescendant',button.id);else search.removeAttribute('aria-activedescendant');}
}
function renderCommands(query=''){
  const menu=$('#block-menu'),list=menu.querySelector('.command-results'),words=commandSearch(query).split(/\s+/).filter(Boolean);
  list.replaceChildren();let group='';
  for(const [type,section,icon,aliases] of blockCommands){
    if(!words.every(word=>commandSearch(blockLabels[type]+' '+aliases).includes(word)))continue;
    if(!words.length&&section!==group){const label=document.createElement('div');label.className='command-group';label.textContent=section;label.setAttribute('role','presentation');list.append(label);group=section;}
    const button=document.createElement('button');button.type='button';button.id='command-'+type;button.dataset.insertBlock=type;button.setAttribute('role','option');button.tabIndex=-1;
    button.innerHTML=`<span class="command-icon" aria-hidden="true">${commandIcon(icon)}</span><span>${blockLabels[type]}</span><span class="command-enter" aria-hidden="true">↵</span>`;
    button.onpointermove=event=>{if(event.movementX||event.movementY)selectCommand(button);};button.onclick=()=>type==='table'?showTablePicker():insertEditorBlock(type);list.append(button);
  }
  const first=list.querySelector('button');if(!first){const empty=document.createElement('p');empty.className='command-empty';empty.textContent='Nenhum bloco encontrado.';list.append(empty);}
  selectCommand(first);list.scrollTop=0;popupPosition(menu,insertionContext.line.getBoundingClientRect());
}
function openInsertMenu(line=null,slash=null){
  const editor=ensureRichEditor();if(!editor)return;
  line=line||getSelection().anchorNode?.parentElement?.closest('.writing-line')||editor.querySelector('.writing-line');
  insertionContext={line,slash,caret:caretOffset(editableText(line))};$('#format-menu').hidden=true;const menu=$('#block-menu');menu.hidden=false;menu.classList.add('command-palette');menu.setAttribute('role','dialog');menu.setAttribute('aria-label','Inserir bloco');menu.onpointerup=null;menu.onkeydown=null;
  const query=slash?.query||'';
  menu.innerHTML='<label class="command-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><input type="search" placeholder="Procurar bloco…" aria-label="Procurar bloco" role="combobox" aria-autocomplete="list" aria-expanded="true" aria-controls="command-results" autocomplete="off" spellcheck="false"></label><div id="command-results" class="command-results" role="listbox" aria-label="Blocos"></div><div class="command-help"><span>↑ ↓ navegar</span><span>↵ inserir</span><span>esc fechar</span></div>';
  const search=menu.querySelector('input');search.value=query;search.oninput=()=>renderCommands(search.value);
  menu.onpointerdown=event=>{if(!event.target.closest('input'))event.preventDefault();};
  renderCommands(query);if(!slash)search.focus({preventScroll:true});
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
  const menu=$('#block-menu');menu.classList.remove('command-palette');menu.setAttribute('role','dialog');menu.innerHTML='<small>Tabela</small><strong id="table-size" role="status">Escolha colunas × linhas</strong><div class="table-picker" role="group" aria-label="Escolher tamanho da tabela"></div><small>Passe o mouse ou arraste e solte para inserir.</small>';
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
function detectSlash(event){normalizePageDOM();ensurePageCaret();if(event.isComposing||view!=='notes')return;const editor=$('#note-body');if(!editor)return;if(editor.tagName==='TEXTAREA'){const before=editor.value.slice(0,editor.selectionStart);if(/(?:^|\s)\/[^\s/]*$/.test(before))ensureRichEditor();else return;}
  const span=getSelection().anchorNode?.parentElement?.closest('.line-text');if(!span||span.closest('.table-block')||span.closest('[data-block-type=code]'))return;const end=caretOffset(span),before=span.textContent.slice(0,end),match=before.match(/(?:^|\s)(\/[^\s/]*)$/);if(match)openInsertMenu(span.closest('.writing-line'),{start:end-match[1].length,end,query:match[1].slice(1)});else if(insertionContext?.slash)hideEditorMenus();
}
function showFormatMenu(){
  const menu=$('#format-menu');if(view!=='notes'||!currentNote()||$('#block-menu').hidden===false||document.querySelector('dialog[open]'))return;
  const selection=getSelection(),parts=selection.rangeCount?editorRangeParts(selection.getRangeAt(0)):[],span=parts.find(part=>part.end>part.start)?.span;
  if(!span||selection.isCollapsed||!$('#note-body').contains(selection.focusNode)){menu.hidden=true;return;}
  formatRange=selection.getRangeAt(0).cloneRange();menu.innerHTML=[['bold','B','Negrito'],['italic','I','Itálico'],['underline','U','Sublinhado'],['strikeThrough','S','Tachado'],['code','</>','Código'],['link','↗','Link'],['highlight','▰','Marca-texto']].map(([command,label,title])=>`<button type="button" data-format="${command}" title="${title}" aria-label="${title}">${label}</button>`).join('');menu.innerHTML+=`<button type="button" class="source-create" draggable="true" aria-label="Criar tarefa ou lembrete" title="Criar tarefa ou lembrete · Arraste para a margem">${commandIcon('check')}</button>`;menu.hidden=false;menu.onpointerdown=event=>{if(!event.target.closest('.source-create'))event.preventDefault();};menu.querySelectorAll('[data-format]').forEach(button=>button.onclick=()=>formatSelection(button.dataset.format));const create=menu.querySelector('.source-create');create.onclick=()=>openSourceComposer(selectedOrigin());create.ondragstart=event=>{sourceDrag=selectedOrigin();if(!sourceDrag){event.preventDefault();return;}event.dataTransfer.setData('application/x-caderninho-action','text');event.dataTransfer.effectAllowed='copy';renderSourceMargin();};const rect=formatRange.getBoundingClientRect();popupPosition(menu,rect);
}
function restoreFormatRange(){if(!formatRange)return;const selection=getSelection();selection.removeAllRanges();selection.addRange(formatRange);}
function formatSelection(command,value){
  const previousEditor=$('#note-body');ensureRichEditor();if(previousEditor!==$('#note-body')&&getSelection().rangeCount)formatRange=getSelection().getRangeAt(0).cloneRange();restoreFormatRange();capturePageSelection();
  if(command==='link'){ $('#editor-link-url').value='';$('#editor-link-dialog').showModal();$('#editor-link-url').focus();return;}
  if(command==='highlight'){const menu=$('#format-menu');menu.innerHTML=pageDocument.COLORS.map((color,i)=>`<button class="highlight-choice" style="background:${color}" aria-label="Marca-texto ${notebookColorNames[i]}" data-highlight="${color}"></button>`).join('')+'<button data-clear-highlight aria-label="Remover marca-texto">×</button>';menu.querySelectorAll('[data-highlight]').forEach(button=>button.onclick=()=>formatSelection('hiliteColor',button.dataset.highlight));menu.querySelector('[data-clear-highlight]').onclick=()=>formatSelection('hiliteColor','transparent');return;}
  applySelectionFormat(command,value);
  $('#format-menu').hidden=true;formatRange=null;saveDocument();
}
$('#editor-link-close').onclick=()=>$('#editor-link-dialog').close();
$('#editor-link-form').onsubmit=event=>{event.preventDefault();const url=pageDocument.link($('#editor-link-url').value);if(!url)return toast('Use um endereço HTTP ou HTTPS.');$('#editor-link-dialog').close();formatSelection('createLink',url);};
document.addEventListener('selectionchange',()=>{if($('#note-body')?.tagName!=='TEXTAREA')showFormatMenu();});
document.addEventListener('mouseup',event=>{const editor=$('#note-body');if(editor?.tagName==='TEXTAREA'&&event.target===editor&&editor.selectionStart!==editor.selectionEnd){ensureRichEditor();showFormatMenu();}});
document.addEventListener('input',event=>{if(event.target.closest('#note-body'))detectSlash(event);});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#block-menu,#format-menu,#add-block,dialog'))hideEditorMenus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'){const context=insertionContext;if(context)event.preventDefault();hideEditorMenus();if(context&&document.contains(context.line))putCaret(editableText(context.line),context.slash?.end??context.caret);}});
document.addEventListener('click',event=>{const anchor=event.target.closest('#note-body a');if(anchor){event.preventDefault();if(event.ctrlKey||event.metaKey)window.notebook.openLink(anchor.href).catch(error=>toast(error.message));}});

document.addEventListener('keydown',event=>{
  if($('#block-menu').hidden||!insertionContext||$('#block-menu .table-picker'))return;
  const choices=[...$('#block-menu').querySelectorAll('[data-insert-block]')];if(!choices.length)return;
  const current=choices.findIndex(button=>button.classList.contains('keyboard-choice'));
  if(['ArrowDown','ArrowUp','Enter'].includes(event.key)){
    event.preventDefault();event.stopImmediatePropagation();
    if(event.key==='Enter'){(choices[Math.max(0,current)]).click();return;}
    choices.forEach(button=>button.classList.remove('keyboard-choice'));
    const next=choices[(Math.max(0,current)+(event.key==='ArrowDown'?1:-1)+choices.length)%choices.length];selectCommand(next);next.scrollIntoView({block:'nearest'});
  }
},true);

// Resolve a DOM range into text segments, without including table controls or media chrome.
function editorTextPoint(element,offset){
  const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT);let node,last;
  while((node=walker.nextNode())){last=node;if(offset<=node.length)return {node,offset:Math.max(0,offset)};offset-=node.length;}
  return last?{node:last,offset:last.length}:{node:element,offset:element.childNodes.length};
}
function editorRangeParts(range){
  const editor=$('#note-body');if(!editor||!range||!editor.contains(range.startContainer)||!editor.contains(range.endContainer))return [];
  const parts=[];
  for(const span of editor.querySelectorAll('.line-text')){
    const line=span.closest('.writing-line');if(!range.intersectsNode(span)&&range.startContainer!==line&&range.endContainer!==line)continue;
    const length=pageDocument.runText(readInlineRuns(span)).length;
    const offset=(node,n)=>{const prefix=document.createRange();prefix.selectNodeContents(span);if(!span.contains(node))return prefix.comparePoint(node,n)>0?length:0;prefix.setEnd(node,n);return Math.min(length,prefix.toString().length);};
    const start=offset(range.startContainer,range.startOffset);
    const end=offset(range.endContainer,range.endOffset);
    if(end>start||(!range.collapsed&&(!length||span.contains(range.startContainer)||span.contains(range.endContainer)||range.startContainer===line||range.endContainer===line)))parts.push({span,line:span.closest('.writing-line'),start,end,length});
  }
  return parts;
}
function applySelectionFormat(command,value){
  const range=getSelection().rangeCount?getSelection().getRangeAt(0):null,parts=editorRangeParts(range).filter(part=>part.end>part.start);if(!parts.length)return;
  const key={bold:'bold',italic:'italic',underline:'underline',strikeThrough:'strike',code:'code',hiliteColor:'highlight',createLink:'link'}[command];if(!key)return;
  const selected=parts.flatMap(part=>sliceInlineRuns(readInlineRuns(part.span),part.start,part.end));
  const remove=key==='highlight'?value==='transparent':key==='link'?false:selected.every(run=>run.marks[key]);
  for(const part of parts){const runs=readInlineRuns(part.span),middle=sliceInlineRuns(runs,part.start,part.end).map(run=>{const marks={...run.marks};if(remove)delete marks[key];else marks[key]=key==='highlight'||key==='link'?value:true;return {...run,marks};});renderInlineRuns(part.span,[...sliceInlineRuns(runs,0,part.start),...middle,...sliceInlineRuns(runs,part.end,part.length)]);}
  const first=parts[0],last=parts.at(-1),a=editorTextPoint(first.span,first.start),b=editorTextPoint(last.span,last.end),selection=getSelection();selection.setBaseAndExtent(a.node,a.offset,b.node,b.offset);
  $('#note-body').dataset.structured='true';
}
function deleteEditorSelection(save=true){
  const selection=getSelection();if(!selection.rangeCount||selection.isCollapsed)return false;
  const range=selection.getRangeAt(0),parts=editorRangeParts(range);if(!parts.length)return false;
  capturePageSelection();if(!save){const history=pageHistories.get(currentNote()?.id);if(history)history.group=null;}const first=parts[0],last=parts.at(-1),lines=[...new Set(parts.map(part=>part.line))];
  let caretSpan=first.span,caret=first.start;
  // A range between ordinary blocks joins the remaining prefix and suffix as one paragraph.
  if(!first.span.classList.contains('table-cell-text')&&!last.span.classList.contains('table-cell-text')){
    const before=sliceInlineRuns(readInlineRuns(first.span),0,first.start),after=sliceInlineRuns(readInlineRuns(last.span),last.end,last.length);
    for(const line of lines)if(line!==first.line)line.remove();
    if(first.line.dataset.blockType==='divider'||(!before.length&&!after.length))resetBlockAppearance(first.line);
    renderInlineRuns(first.span,[...before,...after]);
  }else{
    for(const line of lines){
      const items=parts.filter(part=>part.line===line),table=line.dataset.blockType==='table';
      const full=items.every(part=>part.start===0&&part.end===part.length)&&(!table||items.length===line.querySelectorAll('.table-cell-text').length);
      if(full&&((table&&!(line.contains(range.startContainer)&&line.contains(range.endContainer)))||line!==first.line)){
        if(line===first.line){const replacement=makeWritingLine('',0);line.before(replacement);caretSpan=editableText(replacement);caret=0;}
        line.remove();continue;
      }
      for(const part of items){const runs=readInlineRuns(part.span);renderInlineRuns(part.span,[...sliceInlineRuns(runs,0,part.start),...sliceInlineRuns(runs,part.end,part.length)]);}
    }
  }
  hideEditorMenus();$('#note-body').dataset.structured='true';putCaret(caretSpan,caret);if(save)saveDocument();else reindexDocument();return true;
}
function resetBlockAppearance(line){
  line.classList.remove(...[...line.classList].filter(name=>name.startsWith('block-')||['inline-task','is-checked'].includes(name)));
  line.querySelector('.inline-check')?.remove();delete line.dataset.checkbox;delete line.dataset.checked;line.dataset.blockType='paragraph';editableText(line).spellcheck=true;editableText(line).setAttribute('aria-label',`Texto da nota, parágrafo ${Number(line.dataset.lineIndex)+1}`);
}
function handleDocumentKey(event){
  normalizePageDOM();ensurePageCaret();
  const editor=$('#note-body'),selection=getSelection();if(!editor||!editor.contains(selection.anchorNode)||!editor.contains(selection.focusNode)||event.isComposing)return false;
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='a'){
    event.preventDefault();const range=document.createRange();range.selectNodeContents(editor);selection.removeAllRanges();selection.addRange(range);return true;
  }
  if(event.shiftKey&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)){
    event.preventDefault();const direction=['ArrowUp','ArrowLeft'].includes(event.key)?'backward':'forward';
    const unit=event.metaKey?(['ArrowUp','ArrowDown'].includes(event.key)?'documentboundary':'lineboundary'):event.altKey||event.ctrlKey?'word':['ArrowUp','ArrowDown'].includes(event.key)?'line':'character';
    selection.modify('extend',direction,unit);return true;
  }
  if(event.key==='Enter'&&!selection.isCollapsed&&editorRangeParts(selection.getRangeAt(0)).length>1){event.preventDefault();deleteEditorSelection(false);(document.activeElement.closest('.line-text')||editor.querySelector('.line-text')).dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));return true;}
  if(['Backspace','Delete'].includes(event.key)&&!selection.isCollapsed){event.preventDefault();deleteEditorSelection();return true;}
  if(!selection.isCollapsed)return false;
  const anchor=selection.anchorNode.nodeType===1?selection.anchorNode:selection.anchorNode.parentElement,span=anchor?.closest('.line-text')||anchor?.closest('.writing-line')?.querySelector('.line-text'),line=span?.closest('.writing-line');if(!line)return false;
  const start=caretOffset(span),type=line.dataset.blockType;
  if(['Backspace','Delete'].includes(event.key)&&type==='divider'){
    event.preventDefault();capturePageSelection();const lines=[...editor.querySelectorAll('.writing-line')],index=lines.indexOf(line),neighbor=lines[index-1]||lines[index+1];
    if(neighbor){line.remove();const target=editableText(neighbor);putCaret(target,index?readInlineRuns(target).reduce((n,run)=>n+run.text.length,0):0);}else{resetBlockAppearance(line);putCaret(span);}
    saveDocument();return true;
  }
  if(event.key==='Backspace'&&start===0&&['h1','h2','h3','quote','bullet','number','code'].includes(type)){
    event.preventDefault();capturePageSelection();resetBlockAppearance(line);putCaret(span);saveDocument();return true;
  }
  return false;
}
document.addEventListener('beforeinput',event=>{
  if(!event.target.closest('#note-body')||event.isComposing)return;
  normalizePageDOM();ensurePageCaret();
  const selection=getSelection(),anchor=selection.anchorNode?.nodeType===1?selection.anchorNode:selection.anchorNode?.parentElement,span=anchor?.closest('.line-text')||anchor?.closest('.writing-line')?.querySelector('.line-text');
  if(span?.closest('[data-block-type=divider]')&&event.inputType.startsWith('insert'))resetBlockAppearance(span.closest('.writing-line'));
  const parts=selection.rangeCount?editorRangeParts(selection.getRangeAt(0)):[];
  if(!selection.isCollapsed&&parts.length>1){
    if(event.inputType.startsWith('delete')){event.preventDefault();deleteEditorSelection();}
    else if(event.inputType==='insertText'){event.preventDefault();deleteEditorSelection(false);document.execCommand('insertText',false,event.data||'');}
  }
},true);

// Native contenteditable input can put its caret on the page boundary instead of
// inside a writing span. Repair unknown browser nodes before reading or editing.
function normalizePageDOM(){
  const editor=$('#note-body');if(!editor||editor.tagName==='TEXTAREA')return;
  const unknown=[...editor.childNodes].filter(node=>node.nodeType===3?Boolean(node.textContent):node.nodeType===1&&!node.matches('.writing-line,.paper-cut'));
  if(!unknown.length)return;
  const selection=getSelection(),inside=editor.contains(selection.anchorNode)&&editor.contains(selection.focusNode);
  const offset=(node,n)=>{const range=document.createRange();range.selectNodeContents(editor);range.setEnd(node,n);return range.toString().length;};
  const bookmark=inside?{anchor:offset(selection.anchorNode,selection.anchorOffset),focus:offset(selection.focusNode,selection.focusOffset)}:null;
  for(const node of unknown){
    const fragment=document.createDocumentFragment();
    const collect=value=>{
      if(value.nodeType===1&&value.querySelector(':scope > div,:scope > p')){for(const child of [...value.childNodes])collect(child);return;}
      const text=value.nodeType===3?value.textContent:value.innerText??value.textContent;
      for(const textLine of text.replace(/\r\n?/g,'\n').split('\n')){const line=makeWritingLine(textLine,0);line.dataset.blockType=line.dataset.checkbox?'check':'paragraph';fragment.append(line);}
    };
    collect(node);node.replaceWith(fragment);
  }
  editor.dataset.structured='true';reindexDocument();
  if(bookmark){const point=offset=>{for(const span of editor.querySelectorAll('.line-text')){const length=span.textContent.length;if(offset<=length)return editorTextPoint(span,offset);offset-=length;}return editorTextPoint([...editor.querySelectorAll('.line-text')].at(-1),Number.MAX_SAFE_INTEGER);};const a=point(bookmark.anchor),b=point(bookmark.focus);selection.setBaseAndExtent(a.node,a.offset,b.node,b.offset);}
}
function ensurePageCaret(){
  const editor=$('#note-body'),selection=getSelection();if(!editor||editor.tagName==='TEXTAREA'||!selection.isCollapsed||!editor.contains(selection.anchorNode))return;
  const node=selection.anchorNode,element=node.nodeType===1?node:node.parentElement;if(element.closest('.line-text'))return;
  const line=element.closest('.writing-line');
  if(line){const span=editableText(line);putCaret(span,caretOffset(span));return;}
  if(node===editor){const children=[...editor.childNodes],previous=children.slice(0,selection.anchorOffset).reverse().find(child=>child.nodeType===1&&child.matches('.writing-line'));
    const next=children.slice(selection.anchorOffset).find(child=>child.nodeType===1&&child.matches('.writing-line'));
    let target=previous||next;if(!target){target=makeWritingLine('',0);editor.append(target);}const span=editableText(target);putCaret(span,previous?span.textContent.length:0);
  }
}
document.addEventListener('input',event=>{if(event.target.closest('#note-body'))normalizePageDOM();},true);
