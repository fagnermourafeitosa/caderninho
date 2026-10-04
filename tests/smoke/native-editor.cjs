// Native keyboard/mouse editor scenario driven through webContents.sendInputEvent.
async function runNativeEditorSmoke(win){
  const js=async code=>{try{return await win.webContents.executeJavaScript(code.includes('await ')?'(async()=>{'+code+'})()':code);}catch(error){throw new Error('Native script '+code.slice(0,180)+': '+error.message);}},pause=()=>new Promise(resolve=>setTimeout(resolve,180));
  const key=(keyCode,modifiers=[])=>{keyCode=({ArrowDown:'Down',ArrowUp:'Up',ArrowRight:'Right',ArrowLeft:'Left'})[keyCode]||keyCode;win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});};
  await js("state=await window.notebook.action('note:create',{type:'notes',title:'Barra em nota nova'});view='notes';render();$('#note-body').focus();");
  win.webContents.sendInputEvent({type:'char',keyCode:'/'});await pause();
  if(!await js("!$('#block-menu').hidden&&document.querySelectorAll('[data-insert-block]').length===12"))throw new Error('Native slash in new textarea did not open commands');
  key('Escape');
  await js("state=await window.notebook.action('note:create',{type:'notes',title:'Teclado real'});view='notes';render();ensureRichEditor();const editor=$('#note-body');editor.focus();const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);");
  win.webContents.sendInputEvent({type:'char',keyCode:'/'});await pause();
  if(!await js("!$('#block-menu').hidden&&document.querySelectorAll('[data-insert-block]').length===12"))throw new Error('Native slash at page boundary did not open commands');
  for(const letter of 'tit'){win.webContents.sendInputEvent({type:'char',keyCode:letter});await pause();}
  if(!await js("document.querySelectorAll('[data-insert-block]').length===3"))throw new Error('Native slash search did not filter');
  key('Escape');await pause();
  const setup=async()=>{await js("state=await window.notebook.action('note:update',{id:currentNote().id,editorDoc:pageDocument.fromPlain('Primeira linha\\nSegunda linha\\nTerceira linha')});renderPage();hideEditorMenus();");await pause();};
  for(const method of ['keyboard','mouse'])for(const deletion of ['Backspace','Delete']){
    await setup();
    if(method==='keyboard'){
      await js("putCaret($('#note-body .line-text'),0)");key('ArrowDown',['shift']);key('ArrowDown',['shift']);key('ArrowRight',['shift','meta']);
    }else{
      const coords=await js("(()=>{const spans=[...$('#note-body').querySelectorAll('.line-text')],a=spans[0].getBoundingClientRect(),b=spans.at(-1).getBoundingClientRect();return {x1:Math.round(a.left),y1:Math.round(a.top+a.height/2),x2:Math.round(b.right),y2:Math.round(b.top+b.height/2)}})()");
      win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,x:coords.x1,y:coords.y1});
      win.webContents.sendInputEvent({type:'mouseMove',modifiers:['leftbuttondown'],x:coords.x2,y:coords.y2});
      win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,x:coords.x2,y:coords.y2});
    }
    await pause();
    if(!await js("getSelection().toString().includes('Segunda linha')"))throw new Error('Native '+method+' did not select multiple lines: '+await js("JSON.stringify({selection:getSelection().toString(),html:$('#note-body').innerHTML,active:document.activeElement.outerHTML.slice(0,200),errors:window.smokeErrors})"));
    key(deletion);await pause();
    if(!await js("$('#note-body').value===''&&currentNote().body===''") )throw new Error('Native '+method+' '+deletion+' failed: '+await js("JSON.stringify({text:$('#note-body').innerText,body:currentNote().body,html:$('#note-body').innerHTML,errors:window.smokeErrors})"));
    key('z',['meta']);await pause();if(!await js("currentNote().body.includes('Segunda linha')"))throw new Error('Native undo failed');
  }
  // Recover browser-created paragraphs rather than silently saving an empty document.
  await js("$('#note-body').innerHTML='<div>Texto visível</div><div>Outra linha</div>';const editor=$('#note-body');editor.focus();const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);editor.dispatchEvent(new InputEvent('input',{bubbles:true}));");await pause();
  if(!await js("currentNote().body==='Texto visível\\nOutra linha'"))throw new Error('Native unwrapped paragraphs were not recovered');
  await setup();await js("putCaret($('#note-body .line-text'),0)");key('ArrowRight',['shift','meta']);await pause();
  const clickFormat=async selector=>{const point=await js(`(()=>{const button=document.querySelector(${JSON.stringify(selector)});if(!button)throw Error('Botão contextual ausente');const r=button.getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}})()`);win.webContents.sendInputEvent({type:'mouseDown',button:'left',clickCount:1,...point});win.webContents.sendInputEvent({type:'mouseUp',button:'left',clickCount:1,...point});await pause();};
  await clickFormat('[data-format=highlight]');await pause();await clickFormat('[data-highlight]');
  if(!await js("currentNote().editorDoc[0].runs.some(run=>run.marks.highlight)&&$('#note-body mark')"))throw Error('Marca-texto por clique nativo não persistiu');
  console.log('NATIVE_EDITOR_SMOKE_OK');
}
module.exports = { runNativeEditorSmoke };
