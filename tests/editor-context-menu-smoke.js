(async()=>{
 // The main process answers each menu in order from the runner's script (see run.cjs): task, reminder, null, null, task, error, task.
 const assert=(value,message)=>{if(!value)throw new Error(message);},wait=()=>new Promise(resolve=>setTimeout(resolve,150));
 const select=(span,start,end)=>{const a=editorTextPoint(span,start),b=editorTextPoint(span,end);getSelection().setBaseAndExtent(a.node,a.offset,b.node,b.offset);};
 const rightClick=target=>{const rect=target.getBoundingClientRect();target.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,button:2,clientX:rect.left+4,clientY:rect.top+4}));};
 await action('note:create',{type:'notes',title:'Reforma da varanda'});view='notes';render();const id=currentNote().id;
 const table={id:'menu-table',type:'table',header:true,rows:[[pageDocument.plainRuns('Item'),pageDocument.plainRuns('Prazo')],[pageDocument.plainRuns('Trocar o piso'),pageDocument.plainRuns('Março')]]};
 await action('note:update',{id,editorDoc:[{id:'menu-one',type:'paragraph',runs:[{text:'Antes de mexer na parede, pedir dois orçamentos de marcenaria.',marks:{}}]},table,{id:'menu-two',type:'paragraph',runs:[{text:'',marks:{}}]}]});renderPage();
 const line=()=>document.querySelector('[data-block-id="menu-one"] .line-text'),count=()=>actionsForNote().length;

 // 1. Tarefa opens the composer as the toolbar does.
 select(line(),26,47);rightClick(line());await wait();
 assert($('#source-form')&&$('[name=source-kind][value=task]').checked,'Tarefa abre o formulário como tarefa');
 assert($('#source-form blockquote').textContent==='pedir dois orçamentos','Formulário mostra o trecho: '+$('#source-form blockquote').textContent);
 $('#source-form').requestSubmit();await wait();assert(count()===1&&actionsForNote()[0].kind==='task','Confirmar cria a tarefa ligada ao trecho');

 // 2. Lembrete opens the composer in reminder mode with the date focused.
 select(line(),0,25);rightClick(line());await wait();
 assert($('[name=source-kind][value=reminder]').checked&&!$('#source-date-wrap').hidden,'Lembrete abre o formulário como lembrete');
 assert(document.activeElement===$('#source-due')&&$('#source-due').required,'Lembrete foca o campo de data');
 assert($('#source-submit').textContent.includes('Agendar lembrete'),'Botão agenda o lembrete');
 $('#source-due').value=localDate(Date.now()+7200000);$('#source-form').requestSubmit();await wait();
 assert(count()===2&&actionsForNote()[1].kind==='reminder','Confirmar cria o lembrete');

 // 3. Closing without an action changes nothing; a second right-click while the first is pending is ignored.
 const body=currentNote().body;select(line(),9,14);rightClick(line());rightClick(line());await wait();
 assert(!$('#source-form')&&count()===2&&currentNote().body===body,'Fechar o menu não cria nem altera nada');
 assert(getSelection().toString()==='mexer','Fechar o menu mantém a seleção');

 // 4. Without a selection the menu still opens (actions disabled, checked by the runner).
 getSelection().collapse(editorTextPoint(line(),3).node,editorTextPoint(line(),3).offset);rightClick(line());await wait();
 assert(!$('#source-form'),'Sem seleção nada é criado');

 // 5. A table cell passage becomes an action too.
 const cell=document.querySelector('[data-block-id="menu-table"] [data-row="1"][data-column="0"]');select(cell,0,13);rightClick(cell);await wait();
 assert($('#source-form')&&$('#source-form blockquote').textContent==='Trocar o piso','Célula de tabela abre o formulário com o trecho');
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}));await wait();assert(!$('#source-form')&&count()===2,'Esc cancela sem criar');

 // 6. A failing menu shows a readable notice.
 select(line(),9,14);rightClick(line());await wait();
 assert(!$('#toast').hidden&&$('#toast').textContent==='Não foi possível abrir o menu.','Falha do menu vira aviso legível: '+$('#toast').textContent);

 // 7. Outside the note body there is no menu request (the runner counts six).
 rightClick($('#note-title'));await wait();
 assert(!$('#source-form'),'Fora do texto nada acontece');

 // 8. A note still in plain textarea mode converts its selection before the menu opens.
 await action('note:create',{type:'notes',title:'Rascunho simples'});view='notes';render();const plainId=currentNote().id;
 await action('note:update',{id:plainId,body:'Ligar para o vidraceiro amanhã cedo.'});renderPage();
 const plain=$('#note-body');assert(plain.tagName==='TEXTAREA','Nota sem blocos abre como textarea: '+plain.tagName);
 plain.focus();plain.setSelectionRange(0,23);rightClick(plain);await wait();
 assert($('#source-form')&&$('#source-form blockquote').textContent==='Ligar para o vidraceiro','Textarea leva o trecho para o formulário: '+$('#source-form blockquote')?.textContent);
 closeSourceComposer();await action('note:select',{id});view=state.activeView;render();await wait();

 $('#toast').hidden=true;getSelection().removeAllRanges();
 assert(!window.smokeErrors.length,window.smokeErrors.join('\n'));return {noteId:id,actions:count(),errors:window.smokeErrors};
})()
