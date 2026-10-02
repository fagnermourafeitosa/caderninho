const {test}=require('node:test');const assert=require('node:assert/strict');
const {buildPDFHTML,filename}=require('../pdf-export.cjs');
test('PDF export keeps rich content and linked actions, escaping user text and rejecting unsafe links',()=>{
 const note={id:'a',type:'notes',notebookId:'book',title:'<script>teste</script>',body:'',categories:[],cuts:[],items:[],editorDoc:[{id:'x',type:'paragraph',runs:[{text:'Texto <img src=x>',marks:{bold:true,link:'javascript:alert(1)'}}]},{id:'t',type:'table',header:true,rows:[[[{text:'Coluna',marks:{}}]],[[{text:'Valor',marks:{italic:true}}]]]}]};
 const html=buildPDFHTML(note,{notebooks:[{id:'book',name:'Pessoal'}],sourceActions:[{noteId:'a',kind:'task',done:true,title:'Revisar',origin:{quote:'Texto'}}]},{file:()=>null});
 assert.ok(html.includes('&lt;script&gt;teste&lt;/script&gt;'));assert.ok(html.includes('<strong>Texto &lt;img src=x&gt;</strong>'));assert.ok(html.includes('<th>Coluna</th>'));assert.ok(html.includes('<em>Valor</em>'));assert.ok(html.includes('Revisar'));assert.ok(!html.includes('javascript:'));assert.ok(!html.includes('<script>'));
});
test('PDF filenames cannot escape the chosen directory and have a sensible fallback',()=>{
 assert.equal(filename('../../Meu: arquivo/novo'),'..-..-Meu- arquivo-novo.pdf');assert.equal(filename('...'),'Página.pdf');assert.ok(filename('A'.repeat(200)).length<=104);
});
