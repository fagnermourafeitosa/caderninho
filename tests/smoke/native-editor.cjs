// Native keyboard/mouse editor scenario driven through webContents.sendInputEvent.
async function runNativeEditorSmoke(win){
  const js=async code=>{try{return await win.webContents.executeJavaScript(code.includes('await ')?'(async()=>{'+code+'})()':code);}catch(error){throw new Error('Native script '+code.slice(0,180)+': '+error.message);}},pause=()=>new Promise(resolve=>setTimeout(resolve,180));
  const key=(keyCode,modifiers=[])=>{keyCode=({ArrowDown:'Down',ArrowUp:'Up',ArrowRight:'Right',ArrowLeft:'Left'})[keyCode]||keyCode;win.webContents.sendInputEvent({type:'keyDown',keyCode,modifiers});win.webContents.sendInputEvent({type:'keyUp',keyCode,modifiers});};
  await js("state=await window.notebook.action('note:create',{type:'notes',title:'Barra em nota nova'});view='notes';render();$('#note-body').focus();");
  win.webContents.sendInputEvent({type:'char',keyCode:'/'});await pause();
  if(!await js("!$('#block-menu').hidden&&document.querySelectorAll('[data-insert-block]').length===13"))throw new Error('Native slash in new textarea did not open commands');
  key('Escape');
  await js("state=await window.notebook.action('note:create',{type:'notes',title:'Teclado real'});view='notes';render();ensureRichEditor();const editor=$('#note-body');editor.focus();const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);getSelection().removeAllRanges();getSelection().addRange(r);");
  win.webContents.sendInputEvent({type:'char',keyCode:'/'});await pause();
  if(!await js("!$('#block-menu').hidden&&document.querySelectorAll('[data-insert-block]').length===13"))throw new Error('Native slash at page boundary did not open commands');
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
  // Real Backspace/Delete keys edit the Mermaid code field, one character or a multi-line selection.
  await js("state=await window.notebook.action('note:update',{id:currentNote().id,editorDoc:[{id:'d1',type:'diagram',code:'flowchart TD\\n  A --> B\\n  B --> C'}]});renderPage();hideEditorMenus();openDiagramEditor($('#note-body .diagram-block'));");await pause();
  const diagramCode="$('#note-body .diagram-code').value";
  key('Backspace');await pause();
  if(await js(diagramCode)!=='flowchart TD\n  A --> B\n  B --> ')throw new Error('Native Backspace in diagram code failed: '+JSON.stringify(await js(diagramCode)));
  await js("{const code=$('#note-body .diagram-code');code.setSelectionRange(0,0)}");key('Delete');await pause();
  if(await js(diagramCode)!=='lowchart TD\n  A --> B\n  B --> ')throw new Error('Native Delete in diagram code failed: '+JSON.stringify(await js(diagramCode)));
  await js("{const code=$('#note-body .diagram-code');code.setSelectionRange(code.value.length,code.value.length)}");key('ArrowUp',['shift']);key('ArrowUp',['shift']);await pause();
  key('Backspace');await pause();
  if(!(await js(diagramCode)).startsWith('lowchart')||(await js(diagramCode)).includes('B --> '))throw new Error('Native multi-line Backspace in diagram code failed: '+JSON.stringify(await js(diagramCode)));
  // Select-all and line/document selection shortcuts stay inside the code field instead of selecting the note.
  const codeSelection="(()=>{const code=$('#note-body .diagram-code');return JSON.stringify({active:document.activeElement===code,start:code.selectionStart,end:code.selectionEnd,length:code.value.length})})()";
  // The page leaves Cmd/Ctrl shortcuts alone: macOS routes Cmd+A to the Edit menu's selectAll role and Cmd+Shift+arrows to
  // native text commands, neither reachable through sendInputEvent, so the menu role is invoked directly.
  const pageKeepsShortcut=async(keyCode,modifiers,label)=>{
    await js("{const code=$('#note-body .diagram-code');code.setSelectionRange(3,3);window.shortcutPrevented=null;code.addEventListener('keydown',event=>setTimeout(()=>{window.shortcutPrevented=event.defaultPrevented;}),{once:true});}");key(keyCode,modifiers);await pause();
    const s=JSON.parse(await js(codeSelection));
    if(await js("window.shortcutPrevented")!==false||!s.active||s.start!==3||s.end!==3)throw new Error('Page editor intercepted '+label+' in diagram code: '+JSON.stringify({prevented:await js("window.shortcutPrevented"),...s}));
  };
  await pageKeepsShortcut('a',['meta'],'Cmd+A');await pageKeepsShortcut('a',['control'],'Ctrl+A');await pageKeepsShortcut('ArrowUp',['shift','meta'],'Cmd+Shift+Up');
  for(const modifier of ['meta','control'])for(const letter of ['b','i','u'])await pageKeepsShortcut(letter,[modifier],modifier+'+'+letter);
  win.webContents.selectAll();await pause();
  {const s=JSON.parse(await js(codeSelection));if(!s.active||s.start!==0||s.end!==s.length)throw new Error('Select all in diagram code did not select only the code: '+JSON.stringify(s));}
  await js("closeDiagramEditor($('#note-body .diagram-block'))");await pause();
  if(!await js("currentNote().editorDoc[0].code===$('#note-body .diagram-code').value"))throw new Error('Diagram deletion was not saved');
  // Formatting shortcuts at a caret use native typing attributes and persist through ordinary input.
  for(const modifier of ['meta','control'])for(const [letter,mark] of [['b','bold'],['i','italic'],['u','underline']]){
    await js("state=await window.notebook.action('note:create',{type:'notes',title:'Insertion shortcuts'});state=await window.notebook.action('note:update',{id:currentNote().id,body:'Before '});view='notes';render();const body=$('#note-body');body.focus();body.setSelectionRange(body.value.length,body.value.length);");
    key(letter,[modifier]);await pause();
    win.webContents.sendInputEvent({type:'char',keyCode:'X'});await pause();
    if(!await js(`currentNote().editorDoc?.[0].runs.some(run=>run.text==='X'&&run.marks.${mark})`))throw Error(modifier+'+'+letter+' did not persist the insertion style');
    if(!await js(`currentNote().editorDoc[0].runs[0].text==='Before '&&!currentNote().editorDoc[0].runs[0].marks.${mark}`))throw Error('Insertion shortcut changed existing text');
    key(letter,[modifier]);await pause();win.webContents.sendInputEvent({type:'char',keyCode:'Y'});await pause();
    if(!await js(`currentNote().editorDoc[0].runs.at(-1).text==='Y'&&!currentNote().editorDoc[0].runs.at(-1).marks.${mark}`))throw Error('Repeated insertion shortcut did not disable '+mark);
    key('z',['meta']);await pause();if(!await js("!currentNote().body.endsWith('Y')"))throw Error('Typing shortcut undo did not restore text');
    key('z',['meta','shift']);await pause();if(!await js(`currentNote().editorDoc[0].runs.at(-1).text==='Y'&&!currentNote().editorDoc[0].runs.at(-1).marks.${mark}`))throw Error('Typing shortcut redo did not restore marks');
  }
  console.log('NATIVE_EDITOR_SMOKE_OK');
}
module.exports = { runNativeEditorSmoke };
