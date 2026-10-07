(async()=>{
 const assert=(value,label)=>{if(!value)throw Error(label);};
 const wait=async()=>{await new Promise(resolve=>setTimeout(resolve,80));const deadline=Date.now()+3000;while(pending&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,20));assert(!pending,'Salvamento concluído');};
 const type=async text=>{for(const character of text){document.execCommand('insertText',false,character);await wait();}};
 const key=value=>document.activeElement.dispatchEvent(new KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
 state=await window.notebook.action('note:create',{type:'notes',title:'Categorias ao escrever'});view='notes';
 const id=state.selected.notes;
 for(const name of ['Trabalho','Trilhas','Ação'])state=await window.notebook.action('category:attach',{noteId:id,name});
 state=await window.notebook.action('note:update',{id,editorDoc:[{id:'autocomplete-paragraph',type:'paragraph',runs:[{text:'Antes ',marks:{bold:true}}]}]});render();
 let span=$('#note-body .line-text');putCaret(span,span.textContent.length);
 document.execCommand('insertText',false,'#');await wait();assert(categorySuggestions.hidden,'# sozinho não abre sugestões');
 document.execCommand('insertText',false,'t');await wait();
 assert(!categorySuggestions.hidden&&categoryCompletion.matches.length===2,'Primeira letra abre categorias existentes');
 assert(categorySuggestions.textContent.includes('#Trabalho')&&categorySuggestions.textContent.includes('#Trilhas'),'Filtra por prefixo');
 const rect=categorySuggestions.getBoundingClientRect();assert(rect.left>=0&&rect.right<=innerWidth&&rect.top>=0&&rect.bottom<=innerHeight,'Sugestões cabem na janela');
 const registered=state.categories.length;
 key('ArrowDown');assert(categoryCompletionIndex===1,'Seta escolhe a segunda sugestão');key('Enter');await wait();
 assert($('#note-body').value==='Antes #Trilhas ','Enter completa categoria sem criar linha');
 assert(categorySuggestions.hidden&&state.categories.length===registered,'Não cria categoria parcial');
 assert(readEditorDocument()[0].runs[0].marks.bold,'Texto anterior mantém formatação');
 assert(currentNote().categories.find(category=>category.key==='trilhas').sources.includes('inline'),'Seleção associa categoria no SQLite');
 span=$('#note-body .line-text');putCaret(span,span.textContent.length);await type('#ac');
 assert(categoryCompletion.matches[0].name==='Ação','Busca ignora acentos');key('Tab');await wait();assert($('#note-body').value.endsWith('#Ação '),'Tab insere categoria mantendo escrita');
 await type('#tr');key('Escape');assert(categorySuggestions.hidden&&$('#note-body').value.endsWith('#tr'),'Escape fecha sem alterar texto');
 document.execCommand('insertText',false,'i');await wait();categorySuggestions.querySelector('button').click();await wait();assert($('#note-body').value.endsWith('#Trilhas '),'Clique insere categoria');
 // Middle-of-token completion replaces only the token and keeps its suffix.
 state=await window.notebook.action('note:update',{id,categoryCursor:9,editorDoc:[{id:'autocomplete-paragraph',type:'paragraph',runs:[{text:'Antes #tr depois',marks:{italic:true}}]}]});renderPage();span=$('#note-body .line-text');putCaret(span,9);refreshCategorySuggestions();key('Enter');await wait();
 assert($('#note-body').value==='Antes #Trabalho depois','Preserva texto depois da categoria');assert(readEditorDocument()[0].runs.every(run=>run.marks.italic),'Completar mantém marcas de formatação');
 for(const text of ['https://site/#tr','`#tr`','\\#tr']){state=await window.notebook.action('note:update',{id,editorDoc:[{id:'autocomplete-paragraph',type:'paragraph',runs:pageDocument.plainRuns(text)}]});renderPage();span=$('#note-body .line-text');putCaret(span,text.endsWith('`')?text.length-1:text.length);refreshCategorySuggestions();assert(categorySuggestions.hidden,'Não sugere em URL/código/hashtag escapada: '+text);}
 state=await window.notebook.action('note:update',{id,editorDoc:[{id:'autocomplete-code',type:'code',runs:pageDocument.plainRuns('#tr')}]});renderPage();span=$('#note-body .line-text');putCaret(span,3);refreshCategorySuggestions();assert(categorySuggestions.hidden,'Não sugere dentro de bloco de código');
 state=await window.notebook.action('note:create',{type:'reminders',title:'Categoria no lembrete'});view='reminders';reminderEditor=true;render();
 const textarea=$('#note-body');textarea.focus();textarea.value='Lembrar ';textarea.setSelectionRange(textarea.value.length,textarea.value.length);await type('#tr');key('Enter');await wait();assert(currentNote().body==='Lembrar #Trabalho ','Textarea de lembrete salva autocomplete');
 state=await window.notebook.action('note:select',{id});view='notes';render();
 state=await window.notebook.action('note:update',{id,categoryCursor:12,editorDoc:[{id:'autocomplete-paragraph',type:'paragraph',runs:pageDocument.plainRuns('Organizar #tr')}]});renderPage();span=$('#note-body .line-text');putCaret(span,span.textContent.length);refreshCategorySuggestions();await wait();
 return {errors:window.smokeErrors};
})()
