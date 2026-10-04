const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildPDFHTML,filename}=require('../src/main/pdf-export.cjs');
test('PDF export keeps rich content and linked actions, escaping user text and rejecting unsafe links',()=>{
 const note={id:'a',type:'notes',notebookId:'book',title:'<script>teste</script>',body:'',categories:[],cuts:[],items:[],editorDoc:[{id:'x',type:'paragraph',runs:[{text:'Texto <img src=x>',marks:{bold:true,link:'javascript:alert(1)'}}]},{id:'t',type:'table',header:true,rows:[[[{text:'Coluna',marks:{}}]],[[{text:'Valor',marks:{italic:true}}]]]}]};
 const html=buildPDFHTML(note,{notebooks:[{id:'book',name:'Pessoal'}],sourceActions:[{noteId:'a',kind:'task',done:true,title:'Revisar',origin:{quote:'Texto'}}]},{file:()=>null});
 assert.ok(html.includes('&lt;script&gt;teste&lt;/script&gt;'));assert.ok(html.includes('<strong>Texto &lt;img src=x&gt;</strong>'));assert.ok(html.includes('<th>Coluna</th>'));assert.ok(html.includes('<em>Valor</em>'));assert.ok(html.includes('Revisar'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('<script>'));
});
test('PDF filenames cannot escape the chosen directory and have a sensible fallback',()=>{
 assert.equal(filename('../../Meu: arquivo/novo'),'..-..-Meu- arquivo-novo.pdf');assert.equal(filename('...'),'Página.pdf');assert.ok(filename('A'.repeat(200)).length<=104);
});
test('export shows an attached PDF title and excerpt without embedding its bytes as an image',()=>{
 const note={id:'pdf-note',type:'notes',notebookId:'book',title:'Referencias',body:'Texto',categories:[],cuts:[{id:'pdf',kind:'pdf',blobId:'blob',title:'Meu PDF',description:'Trecho inicial',anchor:0,width:.5}],items:[]};
 const html=buildPDFHTML(note,{notebooks:[],sourceActions:[]},{file:()=>__filename});
 assert.ok(html.includes('PDF · documento anexado'));assert.ok(html.includes('Meu PDF'));assert.ok(html.includes('Trecho inicial'));assert.ok(!html.includes('data:image/png'));
});
test('PDF export carries escaped diagram code for local rendering, without network access',()=>{
 const base={id:'d',type:'notes',notebookId:'book',title:'Fluxo',body:'',categories:[],cuts:[],items:[]};
 const code='flowchart TD\n  A["</pre><script>alert(1)</script>"] --> B';
 const html=buildPDFHTML({...base,editorDoc:[{id:'1',type:'diagram',code},{id:'2',type:'diagram',code:'sequenceDiagram\n  Ana->>Bia: Oi'}]},{notebooks:[],sourceActions:[]},{file:()=>null});
 assert.equal((html.match(/data-diagram/g)||[]).length,2);
 assert.ok(!html.includes('<script>alert'),'Código do diagrama é escapado');assert.ok(html.includes('&lt;/pre&gt;&lt;script&gt;'));
 assert.deepEqual([...html.matchAll(/<script\b[^>]*>/g)].map(match=>match[0]),['<script src="mermaid.min.js">'],'Só o Mermaid local é carregado');
 const policy=html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
 assert.match(policy,/default-src 'none'/);assert.match(policy,/script-src 'self'/);assert.doesNotMatch(policy,/https?:|connect-src|\*/);
 assert.match(policy,/font-src 'self'/);assert.match(html,/@font-face\{font-family:'Excalifont';src:url\('fonts\/excalifont\/Excalifont-Regular-[0-9a-f]+\.woff2'\)/,'Diagramas usam a Excalifont local');
 const plain=buildPDFHTML({...base,editorDoc:[{id:'1',type:'paragraph',runs:[{text:'Sem diagrama',marks:{}}]}]},{notebooks:[],sourceActions:[]},{file:()=>null});
 assert.doesNotMatch(plain,/<script|script-src|font-src|Excalifont/,'Páginas sem diagrama não carregam scripts nem fontes');
});
