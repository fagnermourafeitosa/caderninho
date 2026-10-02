(async()=>{
 const assert=(value,label)=>{if(!value)throw Error(label);};
 const command=async(name,input)=>{state=await window.notebook.action(name,input);};
 await command('note:create',{type:'notes',title:'Uma nota inteira na home'});const id=state.selected.notes;
 const block={id:pageDocument.id(),type:'paragraph',runs:[{text:'Texto com destaque ',marks:{bold:true,highlight:'#f8d985'}},{text:'e um link.',marks:{link:'https://example.com'}}]};
 const doc=[{id:pageDocument.id(),type:'h2',runs:pageDocument.plainRuns('Um título dentro da nota')},block,{id:pageDocument.id(),type:'check',checked:true,runs:pageDocument.plainRuns('Item concluído')},{id:pageDocument.id(),type:'table',header:true,rows:[[pageDocument.plainRuns('Plano'),pageDocument.plainRuns('Quando')],[pageDocument.plainRuns('Viajar'),pageDocument.plainRuns('Sábado')]]},{id:pageDocument.id(),type:'code',runs:pageDocument.plainRuns('const ideia = 1;')},{id:pageDocument.id(),type:'paragraph',runs:pageDocument.plainRuns('Texto longo '.repeat(40)+'fim preservado.')}];
 await command('note:update',{id,editorDoc:doc});
 state=await window.notebook.image({noteId:id,name:'Paisagem',bytes:new Uint8Array(window.cutTestBytes)});
 let cut=state.notes.find(note=>note.id===id).cuts[0];await command('cut:layout',{id:cut.id,side:'left',anchor:1,width:.45});
 state=await window.notebook.link({noteId:id,url:'https://example.test/referencia'});
 await command('source:create',{noteId:id,title:'Revisar o destaque',kind:'task',origin:{kind:'text',quote:'Texto com destaque ',parts:[{blockId:block.id,start:0,end:18}]}});
 await command('note:select',{id});view='notes';render();const expected=[...$('#note-body').querySelectorAll('.line-text')].map(span=>span.innerHTML);
 const original=JSON.stringify(currentNote().editorDoc);
 await command('view:select',{view:'home'});view='home';render();await refreshHomeRelated();
 const host=$('#home-note-preview');assert(host&&host.dataset.noteId===id,'Última nota correta');
 assert(JSON.stringify([...host.querySelectorAll('.line-text')].map(span=>span.innerHTML))===JSON.stringify(expected),'Home usa os mesmos blocos e destaques do editor');
 assert(host.querySelector('.block-h2')&&host.querySelector('strong')&&host.querySelector('mark')&&host.querySelector('a')&&host.querySelector('.block-code')&&host.querySelector('.paper-table'),'Formatação, código e tabela preservados');
 assert(host.textContent.includes('fim preservado.'),'Não corta a nota em 240 caracteres');
 assert(host.querySelector('.cut-left').style.width==='45%'&&host.querySelector('img')&&host.querySelector('.cut-open'),'Imagens, posição e cartões de links preservados');
 assert(!host.querySelector('[contenteditable],.cut-controls,.table-tools')&&host.querySelector('.inline-check').disabled&&host.querySelector('.inline-check').checked,'Prévia não edita ou remove conteúdo');
 assert(!$('#daily-body')&&!$('.daily-writing')&&!$('#home-related-content .related-caption'),'Home sem escrita diária e legenda do grafo');
 assert(JSON.stringify((await window.notebook.state()).notes.find(note=>note.id===id).editorDoc)===original,'Renderização não modifica nota salva');
 return {errors:window.smokeErrors};
})()
