(async()=>{
 const assert=(value,message)=>{if(!value)throw Error(message);};
 state=await window.notebook.action('note:create',{type:'notes',title:'Exportação anterior'});view='notes';const id=state.selected.notes;
 const doc=[{id:'pdf-title',type:'h1',runs:pageDocument.plainRuns('Ideias que ficam no papel')},{id:'pdf-text',type:'paragraph',runs:[{text:'Texto em negrito, ',marks:{bold:true}},{text:'com destaque e acentos: ação, memória.',marks:{highlight:'#f8d985'}}]},{id:'pdf-table',type:'table',header:true,rows:[[pageDocument.plainRuns('Pessoa'),pageDocument.plainRuns('Próximo passo')],[pageDocument.plainRuns('Ana'),pageDocument.plainRuns('Revisar o projeto')]]},{id:'pdf-check',type:'bullet',runs:pageDocument.plainRuns('Separar referências')},{id:'pdf-code',type:'code',runs:pageDocument.plainRuns('const ideia = "caderninho";')},...Array.from({length:26},(_,i)=>({id:'pdf-long-'+i,type:'paragraph',runs:pageDocument.plainRuns('Parágrafo '+(i+1)+': uma página longa deve continuar em outras folhas, preservando o texto completo e a leitura.')}))];
 state=await window.notebook.action('note:update',{id,editorDoc:doc});
 state=await window.notebook.image({noteId:id,name:'Ilustração do caderno',bytes:new Uint8Array(window.cutTestBytes)});
 state=await window.notebook.action('source:create',{noteId:id,kind:'reminder',due:new Date(Date.now()+3600000).toISOString(),title:'Revisar estas ideias',origin:{kind:'text',quote:'Texto em negrito,',parts:[{blockId:'pdf-text',start:0,end:19}]}});
 render();assert($('#export-pdf'),'Exportar PDF disponível na página');
 $('#note-title').value='Exportação de uma página';await $('#export-pdf').onclick();assert($('#toast').textContent==='PDF exportado.','Botão conclui a exportação com imagem grande: '+$('#toast').textContent);assert(currentNote().title==='Exportação de uma página','Botão exporta o título mais recente');
 assert(currentNote().body.includes('Parágrafo 26'),'Exportação preserva nota original');
 state=await window.notebook.action('note:create',{type:'notes',title:'Link exportado'});view='notes';const linkId=state.selected.notes;
 state=await window.notebook.link({noteId:linkId,url:'https://example.test/reference'});
 for(let attempt=0;attempt<50;attempt++){await new Promise(resolve=>setTimeout(resolve,60));state=await window.notebook.state();if(currentNote().cuts[0]?.status!=='loading')break;}
 const card=currentNote().cuts[0];assert(card.status==='ready'&&card.blobId,'Cartão de link tem capa local grande');
 render();const linkResult=await window.notebook.exportPDF(linkId);assert(!linkResult.canceled,'Exporta cartão de link com capa grande');
 state=await window.notebook.action('cut:trash',{id:card.id});
 state=await window.notebook.link({noteId:linkId,url:'https://example.test/no-cover'});
 for(let attempt=0;attempt<50;attempt++){await new Promise(resolve=>setTimeout(resolve,60));state=await window.notebook.state();if(currentNote().cuts[0]?.status!=='loading')break;}
 assert(currentNote().cuts[0].status==='ready'&&!currentNote().cuts[0].blobId,'Cartão sem capa disponível');
 state=await window.notebook.action('note:update',{id:linkId,title:'Link sem capa exportado'});await window.notebook.exportPDF(linkId);
 state=await window.notebook.action('note:create',{type:'tasks',title:'Lista exportada'});view='tasks';const tasks=state.selected.tasks;
 render();if(document.querySelector('#export-pdf'))throw Error('Pipelines não oferecem Exportar PDF');
 state=await window.notebook.action('note:create',{type:'reminders',title:'Lembrete exportado'});view='reminders';reminderEditor=true;const reminder=state.selected.reminders;
 state=await window.notebook.action('note:update',{id:reminder,body:'Levar as ideias para a reunião.'});state=await window.notebook.action('schedule:activate',{id:reminder,due:new Date(Date.now()+86400000).toISOString()});render();await window.notebook.exportPDF(reminder);
 let rejected=false;try{await window.notebook.exportPDF('missing-page');}catch{rejected=true;}assert(rejected,'Não exporta uma página inexistente');
 return {errors:window.smokeErrors};
})()
