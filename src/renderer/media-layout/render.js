let mediaLayoutObserver,mediaLayoutFrame=0;
function disposeMediaLayout() { mediaLayoutObserver?.disconnect();cancelAnimationFrame(mediaLayoutFrame);cancelMediaDrag(); }
function noteMediaPlacements(note) {
  return note.cuts.map(({id,groupId,position,anchor,side,width})=>({id,groupId,position,anchor,side,width}));
}
function mediaAnchorLine(editor,body,anchor) {
  const lines=[...editor.querySelectorAll('.writing-line')];
  const index=Math.min(anchor,Math.max(0,body.split('\n').length-1));
  return lines.find((line,i)=>index>=Number(line.dataset.lineIndex)&&(!lines[i+1]||index<Number(lines[i+1].dataset.lineIndex)))||lines.at(-1);
}
function styleMediaGroup(group,projected) {
  group.style.width=projected.width+'px';group.style.cssFloat=projected.float;
  group.style.marginLeft=projected.float==='right'?'18px':'0';group.style.marginRight=projected.float==='left'?'18px':'0';
  for(const card of projected.cards){const element=[...group.children].find(node=>node.dataset.cutId===card.id);element.style.width=card.pixels+'px';}
}
function mountMediaGroups(editor,note) {
  mediaLayoutObserver?.disconnect();cancelAnimationFrame(mediaLayoutFrame);
  const placements=noteMediaPlacements(note);
  for(const cards of MediaLayoutDomain.groups(placements)) {
    const group=document.createElement('div');
    group.className='media-card-group';group.contentEditable='false';group.dataset.groupId=cards[0].groupId;
    for(const card of cards)group.append(cutCard(note.cuts.find(cut=>cut.id===card.id)));
    const line=mediaAnchorLine(editor,note.body,cards[0].anchor);
    editor.insertBefore(group,line||null);
  }
  const update=()=>{
    const width=editor.clientWidth-8;
    if(width<=0)return;
    for(const projected of MediaLayoutDomain.project(placements,width)) {
      const group=[...editor.querySelectorAll('.media-card-group')].find(node=>node.dataset.groupId===projected.groupId);
      if(!group)return;
      styleMediaGroup(group,projected);
    }
  };
  let previousWidth=-1;
  mediaLayoutObserver=new ResizeObserver(()=>{
    const width=editor.clientWidth;
    if(width===previousWidth)return;
    previousWidth=width;cancelAnimationFrame(mediaLayoutFrame);
    mediaLayoutFrame=requestAnimationFrame(update);
  });mediaLayoutObserver.observe(editor);
}
function refreshMediaGroups(note) {
  const editor=$('#note-body');if(!editor?.classList.contains('collage-editor'))return;
  const scroll=editor.scrollTop,body=editor.value;
  for(const group of editor.querySelectorAll('.media-card-group'))group.remove();
  mountMediaGroups(editor,{...note,body});
  editor.scrollTop=scroll;
}
function refreshImportedMedia(note) {
  const editor=$('#note-body');if(!editor)return;
  if(editor.classList.contains('collage-editor')){refreshMediaGroups(note);return;}
  if(!note.cuts.length)return;
  const body=editor.value,start=body.slice(0,editor.selectionStart).split('\n'),end=body.slice(0,editor.selectionEnd).split('\n');
  mountCollage({...note,body,editorDoc:null});
  restoreEditorSelection({field:'body',line:start.length-1,start:start.at(-1).length,endLine:end.length-1,end:end.at(-1).length});
}
