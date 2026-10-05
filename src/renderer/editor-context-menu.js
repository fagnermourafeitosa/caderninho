// Right-click in the note body: native menu with Tarefa/Lembrete (spec 005) handing off to the margin composer.
let editorContextMenuPending=false;
function contextMenuOrigin(){
 const plain=$('#note-body');if(plain?.tagName==='TEXTAREA'){if(plain.selectionStart===plain.selectionEnd)return null;ensureRichEditor();}
 const editor=$('#note-body'),selection=getSelection();
 if(!editor||!selection.rangeCount||selection.isCollapsed||!editor.contains(selection.anchorNode)||!editor.contains(selection.focusNode))return null;
 formatRange=selection.getRangeAt(0).cloneRange();return selectedOrigin();
}
document.addEventListener('contextmenu',async event=>{
 const editor=$('#note-body');if(view!=='notes'||!currentNote()||!editor?.contains(event.target))return;
 // Code fields inside blocks (diagrams) keep their own behavior.
 if(event.target!==editor&&event.target.closest('textarea,input'))return;
 event.preventDefault();if(editorContextMenuPending)return;
 editorContextMenuPending=true;const noteId=currentNote().id,origin=contextMenuOrigin();
 try{
  const kind=await window.notebook.editorContextMenu({hasSelection:Boolean(origin)});
  if(kind&&origin&&currentNote()?.id===noteId)await openSourceComposer(origin,kind);
 }catch(error){console.error('Menu de contexto do editor falhou:',error);toast('Não foi possível abrir o menu.');}
 finally{editorContextMenuPending=false;}
});
