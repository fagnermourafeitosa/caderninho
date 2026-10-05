(async()=>{
 const assert=(value,label)=>{if(!value)throw new Error(label);};
 const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const settle=async()=>{await sleep(80);const deadline=Date.now()+3000;while(pending&&Date.now()<deadline)await sleep(20);};
 const until=async(check,label)=>{const deadline=Date.now()+5000;while(!check()){if(Date.now()>deadline)throw new Error(label);await sleep(40);}};
 const block=()=>$('#note-body .diagram-block');
 // Mermaid wraps long labels into lines, so labels are compared without whitespace.
 const squash=text=>String(text||'').replace(/\s+/g,'');
 const drawn=(label,root=block())=>squash(root?.querySelector('.diagram-drawing svg')?.textContent).includes(squash(label));
 const savedCode=()=>currentNote().editorDoc?.find(item=>item.type==='diagram')?.code;
 const type=async value=>{const code=block().querySelector('.diagram-code');code.value=value;code.dispatchEvent(new Event('input',{bubbles:true}));await settle();};
 state=await window.notebook.action('note:create',{type:'notes',title:'Fluxo de compras'});view='notes';render();const id=currentNote().id;

 // Insert from the palette, found without accents, starting from the flowchart template.
 openInsertMenu();const search=$('#block-menu input');search.value='fluxograma';search.dispatchEvent(new Event('input',{bubbles:true}));
 assert(document.querySelectorAll('[data-insert-block]').length===1&&document.querySelector('[data-insert-block=diagram]'),'Paleta encontra o diagrama por "fluxograma"');
 search.value='sequencia';search.dispatchEvent(new Event('input',{bubbles:true}));assert(document.querySelector('[data-insert-block=diagram]'),'Busca sem acento encontra o diagrama');
 document.querySelector('[data-insert-block=diagram]').click();
 assert([...document.querySelectorAll('[data-diagram-template]')].map(button=>button.textContent).join('|')==='Fluxograma|Sequência|Mapa mental|Linha do tempo|Em branco','Cinco modelos de diagrama');
 document.querySelector('[data-diagram-template="Fluxograma"]').click();await settle();
 assert(block()?.classList.contains('editing')&&document.activeElement===block().querySelector('.diagram-code'),'Diagrama novo abre editando o código');
 await until(()=>drawn('Vale a pena'),'Modelo de fluxograma desenhado');
 assert(block().querySelector('.diagram-drawing svg').outerHTML.includes('Excalifont')&&document.fonts.check('16px Excalifont','Aprovação'),'Diagrama usa a Excalifont local, carregada com acentos');
 assert(savedCode().startsWith('flowchart TD'),'Modelo salvo no SQLite');

 // Live preview, invalid code without losing the last drawing, code always saved.
 await type('flowchart TD\n  A[Pedido] --> B{Aprovação}\n  B --> C[Comprar com calma]');
 await until(()=>drawn('Comprar com calma'),'Desenho atualiza enquanto digita');
 await type('flowchart TD\n  A[Pedido] --> B{Aprovação}\n  B --> C[Comprar com calma]\n  C -->');
 await until(()=>!block().querySelector('.diagram-notice').hidden,'Código inválido mostra aviso');
 assert(/linha \d+/.test(block().querySelector('.diagram-notice').textContent),'Aviso informa a linha do erro');
 assert(block().querySelector('.diagram-drawing').classList.contains('stale')&&drawn('Comprar com calma'),'Último desenho válido continua visível');
 assert(savedCode().endsWith('C -->'),'Código inválido também é salvo');
 await type('flowchart TD\n  A[Pedido] --> B{Aprovação}\n  B --> C[Comprar com calma]\n  C --> D[Guardar nota fiscal]');
 await until(()=>drawn('Guardar nota fiscal')&&block().querySelector('.diagram-notice').hidden,'Código corrigido volta a desenhar');
 // The drawing never scrolls on its own: only the page does.
 {const drawing=block().querySelector('.diagram-drawing'),svg=drawing.querySelector('svg');assert(!['auto','scroll'].includes(getComputedStyle(drawing).overflowY)&&drawing.scrollHeight<=drawing.clientHeight+1&&drawing.scrollWidth<=drawing.clientWidth+1&&svg.getBoundingClientRect().width<=drawing.clientWidth+1,'Diagrama sem barra de rolagem própria');}

 // Esc closes; double-click reopens; Concluir closes.
 block().querySelector('.diagram-code').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));await settle();
 assert(!block().classList.contains('editing')&&block().querySelector('.diagram-editor').hidden,'Esc fecha a edição');
 block().querySelector('.diagram-drawing').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 assert(block().classList.contains('editing'),'Dois cliques reabrem a edição');
 block().querySelector('.diagram-done').click();await settle();assert(!block().classList.contains('editing'),'Concluir fecha a edição');

 // Undo: the edit session is one step, insertion is another.
 editPageHistory('undo');await sleep(250);await settle();
 assert(savedCode()?.includes('Vale a pena'),'Desfazer volta ao modelo de uma vez');
 editPageHistory('undo');await sleep(250);await settle();assert(!savedCode()&&!block(),'Desfazer remove o diagrama inserido');
 editPageHistory('redo');await sleep(250);await settle();editPageHistory('redo');await sleep(250);await settle();
 assert(savedCode()?.includes('Guardar nota fiscal')&&block(),'Refazer restaura o diagrama editado');
 await until(()=>drawn('Guardar nota fiscal'),'Diagrama restaurado é desenhado');

 // A page re-render while the code is still focused (no focusout) must still close the session as one undo step.
 block().querySelector('.diagram-drawing').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));
 await type(savedCode()+'\n  D --> E[Arquivar]');renderPage();await settle();
 assert(!$('#note-body .diagram-block.editing'),'Página redesenhada não fica em edição');
 editPageHistory('undo');await sleep(250);await settle();assert(savedCode()?.endsWith('D[Guardar nota fiscal]'),'Desfazer após redesenho volta ao código anterior à sessão');
 editPageHistory('redo');await sleep(250);await settle();assert(savedCode()?.endsWith('E[Arquivar]'),'Refazer após redesenho restaura a sessão');
 // Search (copying needs a real user gesture and is checked by the runner).
 openGlobalSearch();searchInput.value='nota fiscal';renderGlobalSearch();assert(searchMatches.some(match=>match.note.id===id),'Busca encontra texto do diagrama');closeGlobalSearch();

 // Home preview draws the diagram without editing tools.
 state=await window.notebook.action('view:select',{view:'home'});view='home';render();
 await until(()=>drawn('Guardar nota fiscal',$('#home-note-preview .diagram-block')),'Prévia da home desenha o diagrama');
 assert(!$('#home-note-preview .diagram-tools'),'Prévia da home não mostra ferramentas do diagrama');

 // Removal through the visible tool, undoable.
 state=await window.notebook.action('note:select',{id});view='notes';render();
 block().querySelector('[data-diagram-action=remove]').click();await settle();assert(!block()&&!savedCode(),'Remover diagrama');
 editPageHistory('undo');await sleep(250);await settle();assert(block()&&savedCode(),'Desfazer restaura o diagrama removido');

 // A second, invalid diagram for the PDF fallback.
 const doc=[...currentNote().editorDoc,{id:pageDocument.id(),type:'diagram',code:'flowchart TD\n  X -->'}];
 state=await window.notebook.action('note:update',{id,body:pageDocument.text(doc),editorDoc:doc});render();
 const result=await window.notebook.exportPDF(id);assert(!result.canceled&&result.filePath,'Exporta PDF com diagramas');
 return {errors:window.smokeErrors,noteId:id,pdf:result.filePath};
})()
