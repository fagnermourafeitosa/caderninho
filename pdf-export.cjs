const fs=require('node:fs');
const path=require('node:path');const os=require('node:os');
const document=require('./editor-document.js');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function rich(runs){return (runs||[]).map(run=>{const marks=run.marks||{};let text=escape(run.text).replace(/\n/g,'<br>');for(const [mark,tag] of [['code','code'],['bold','strong'],['italic','em'],['underline','u'],['strike','s']])if(marks[mark])text=`<${tag}>${text}</${tag}>`;if(document.COLORS.includes(marks.highlight))text=`<mark style="background:${marks.highlight}">${text}</mark>`;const href=document.link(marks.link);if(href)text=`<a href="${escape(href)}">${text}</a>`;return text;}).join('');}
function check(done){return `<span class="checkbox ${done?'done':''}" aria-label="${done?'Concluída':'Pendente'}">${done?'✓':''}</span>`;}
function blockHTML(block,number=1){
 const text=rich(block.runs);
 if(block.type==='table'){const row=(cells,tag)=>'<tr>'+cells.map(cell=>`<${tag}>${rich(cell)}</${tag}>`).join('')+'</tr>';return '<table>'+(block.header?'<thead>'+row(block.rows[0],'th')+'</thead>':'')+'<tbody>'+block.rows.slice(block.header?1:0).map(cells=>row(cells,'td')).join('')+'</tbody></table>';}
 if(block.type==='divider')return '<hr>';
 if(block.type==='code')return `<pre>${escape(document.runText(block.runs))}</pre>`;
 if(block.type==='check')return `<div class="check-row">${check(block.checked)}<div>${text||'&nbsp;'}</div></div>`;
 if(block.type==='bullet'||block.type==='number')return `<${block.type==='bullet'?'ul':`ol start="${number}"`}><li>${text}</li></${block.type==='bullet'?'ul':'ol'}>`;
 const tag={h1:'h2',h2:'h3',h3:'h4',quote:'blockquote'}[block.type]||'p';return `<${tag}>${text||'&nbsp;'}</${tag}>`;
}
function date(value){return value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'';}
function filename(title){return (String(title||'Sem título').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/[. ]+$/g,'').trim().slice(0,100)||'Página')+'.pdf';}
function buildPDFHTML(note,snapshot,media){
 const book=snapshot.notebooks.find(book=>book.id===note.notebookId);
 const blocks=note.editorDoc?document.normalize(note.editorDoc):document.fromPlain(note.body);
 const cuts=note.cuts||[];let line=0,number=0;const content=[];
 function mediaHTML(cut){
  let image='';const file=cut.blobId&&media.file(cut.blobId);
  if(cut.kind!=='pdf'&&file&&fs.existsSync(file))image=`<img src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}" alt="${escape(cut.title)}" style="max-width:${Math.max(.25,Math.min(.85,cut.width||.6))*100}%">`;
  const url=document.link(cut.url);
  return `<figure>${cut.kind==='pdf'?'<small>PDF · documento anexado</small>':''}${image}${cut.title?`<figcaption>${escape(cut.title)}</figcaption>`:''}${cut.description?`<p>${escape(cut.description)}</p>`:''}${url?`<a class="url" href="${escape(url)}">${escape(url)}</a>`:''}${!image&&cut.kind==='image'?'<p class="muted">Imagem indisponível</p>':''}</figure>`;
 }
 const emitted=new Set();
 for(const block of blocks){const end=line+document.blockText(block).split('\n').length;for(const cut of cuts)if(cut.anchor>=line&&cut.anchor<end){content.push(mediaHTML(cut));emitted.add(cut.id);}number=block.type==='number'?number+1:0;content.push(blockHTML(block,number));line=end;}
 for(const cut of cuts)if(!emitted.has(cut.id))content.push(mediaHTML(cut));
 if(note.type==='tasks')content.push(...note.items.map(item=>`<div class="check-row">${check(item.done)}<div>${escape(item.title)}${item.done&&item.checkedAt?`<small>Concluída em ${date(item.checkedAt)}</small>`:''}</div></div>`));
 const actions=(snapshot.sourceActions||[]).filter(action=>action.noteId===note.id);
 const actionsHTML=actions.length?'<section class="actions"><h2>Tarefas e lembretes desta página</h2>'+actions.map(action=>`<div class="action">${action.kind==='task'?check(action.done):'<span class="reminder">◷</span>'}<div><strong>${escape(action.title)}</strong>${action.due?`<small>${action.expired?'Cancelado · ':action.fired?'Avisado · ':''}${date(action.due)}</small>`:''}${action.origin?.quote?`<blockquote>${escape(action.origin.quote)}</blockquote>`:''}</div></div>`).join('')+'</section>':'';
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'"><title>${escape(note.title||'Sem título')}</title><style>
 @page {size:A4;background:#fbf0d5;}html{background:#fbf0d5;-webkit-print-color-adjust:exact;print-color-adjust:exact}*{box-sizing:border-box}body{margin:0;color:#303025;font:12pt/1.6 Georgia,serif;background:#fbf0d5;-webkit-print-color-adjust:exact;print-color-adjust:exact}header{border-bottom:1px solid #b2a27b;padding-bottom:14pt;margin-bottom:22pt}.book{font:10pt Arial,sans-serif;color:#8a8068}h1{font-size:28pt;line-height:1.2;margin:7pt 0 12pt;overflow-wrap:anywhere}h2{font-size:20pt}h3{font-size:16pt}h4{font-size:13pt}h2,h3,h4{break-after:avoid;line-height:1.3;margin:18pt 0 8pt}p{margin:0 0 10pt;white-space:pre-wrap;overflow-wrap:anywhere;orphans:3;widows:3}.tags{font:10pt Arial,sans-serif}.tags span{display:inline-block;background:#efe0b9;border:1px solid #c4b087;border-radius:9pt;padding:2pt 7pt;margin:0 4pt 5pt 0}.dates,small,.muted{font:9pt/1.5 Arial,sans-serif;color:#8a8068}small{display:block;margin-top:4pt}.dates{margin-top:6pt}.check-row,.action{display:flex;gap:9pt;margin:10pt 0;break-inside:avoid}.check-row>div,.action>div{flex:1;min-width:0;overflow-wrap:anywhere}.checkbox{display:inline-block;flex:none;width:13pt;height:13pt;border:1pt solid #8a8068;border-radius:2pt;line-height:12pt;text-align:center;margin-top:3pt;font:11pt Arial,sans-serif}.checkbox.done{background:#efe0b9}.reminder{flex:none}blockquote{margin:8pt 0;padding:8pt 12pt;background:#efe0b9;white-space:pre-wrap;overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#efe0b9;padding:12pt;font:10pt/1.5 monospace}code{font:10pt monospace;background:#efe0b9}a{color:#765a32;overflow-wrap:anywhere}mark{color:inherit}table{break-inside:avoid;width:100%;border-collapse:collapse;table-layout:fixed;margin:14pt 0;font-size:10pt}thead{display:table-header-group}th,td{border:1px solid #b2a27b;padding:6pt;vertical-align:top;overflow-wrap:anywhere}th{background:#efe0b9}tr{break-inside:avoid}figure{margin:14pt 0;break-inside:avoid}img{display:block;max-width:100%;max-height:175mm;object-fit:contain;margin:auto}figcaption{font:10pt/1.5 Arial,sans-serif;margin-top:6pt}.url{font-size:9pt}.actions{border-top:1px solid #b2a27b;margin-top:24pt;padding-top:6pt}hr{border:0;border-top:1px solid #b2a27b;margin:18pt 0}li{overflow-wrap:anywhere}
 </style></head><body><header><div class="book">Caderninho · ${escape(book?.name||'Meu caderno')}</div><h1>${escape(note.title||'Sem título')}</h1><div class="tags">${(note.categories||[]).map(category=>`<span>#${escape(category.name)}</span>`).join('')}</div><div class="dates">${note.created?'Criada em '+date(note.created):''}${note.updated?' · Atualizada em '+date(note.updated):''}</div>${note.type==='reminders'&&note.scheduledAt?`<p class="dates">Lembrete: ${date(note.scheduledAt)}${note.enabled?'':' · Inativo'}</p>`:''}</header><main>${content.join('')}${actionsHTML}</main></body></html>`;
}
async function createPDF(WebContentsView,html){
 const directory=await fs.promises.mkdtemp(path.join(os.tmpdir(),'caderninho-pdf-'));
 const view=new WebContentsView({webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false}});
 view.setBounds({x:0,y:0,width:794,height:1123});
 const contents=view.webContents;
 contents.setWindowOpenHandler(()=>({action:'deny'}));
 try{
  const file=path.join(directory,'page.html');await fs.promises.writeFile(file,html,{mode:0o600});
  await contents.loadFile(file);
  contents.on('will-navigate',event=>event.preventDefault());
  await contents.executeJavaScript(`Promise.all([document.fonts.ready,...[...document.images].map(image=>image.complete?Promise.resolve():new Promise(resolve=>{image.onload=resolve;image.onerror=resolve;}))])`);
  return await contents.printToPDF({pageSize:'A4',printBackground:true,preferCSSPageSize:true,margins:{top:.6,bottom:.65,left:.6,right:.6},displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font:9px Arial;width:100%;text-align:center;color:#8a8068">Caderninho · <span class="pageNumber"></span> / <span class="totalPages"></span></div>'});
 }finally{contents.close();await fs.promises.rm(directory,{recursive:true,force:true});}
}
module.exports={buildPDFHTML,createPDF,filename};
