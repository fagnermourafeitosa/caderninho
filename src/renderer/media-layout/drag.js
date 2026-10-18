let cancelMediaDrag=()=>{};
function mediaDropTarget(x,y,excluded) {
  const editor=$('#note-body');if(!editor)return null;
  const bounds=editor.getBoundingClientRect();
  if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return null;
  for(const card of editor.querySelectorAll('.paper-cut')) {
    if(card.dataset.cutId===excluded)continue;
    const box=card.getBoundingClientRect();
    if(x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom) {
      const edge=y<box.top+box.height*.2?'before':y>box.bottom-box.height*.2?'after':x<box.left+box.width/2?'beside-before':'beside-after';
      return {placement:{kind:'card',cutId:card.dataset.cutId,edge},box};
    }
  }
  const lines=[...editor.querySelectorAll('.writing-line')],line=lines.find(line=>y<line.getBoundingClientRect().bottom)||lines.at(-1);
  return {placement:{kind:'block',anchor:Number(line?.dataset.lineIndex||0),side:x<bounds.left+bounds.width/2?'left':'right'},box:line?.getBoundingClientRect()||bounds};
}
function showMediaIndicator(target) {
  document.querySelector('.media-insertion-indicator')?.remove();
  if(!target)return;
  const marker=document.createElement('div'),{placement,box}=target;
  marker.className='media-insertion-indicator';marker.setAttribute('aria-hidden','true');
  const beside=placement.edge?.startsWith('beside'),after=placement.edge?.endsWith('after');
  marker.style.left=(beside?(after?box.right:box.left):box.left)+'px';
  marker.style.top=(placement.edge==='after'?box.bottom:box.top)+'px';
  marker.style.width=(beside?3:box.width)+'px';marker.style.height=(beside?box.height:3)+'px';
  document.body.append(marker);
}
function bindMediaDrag(card,cut) {
  const grip=card.querySelector('.cut-grip');
  grip.onpointerdown=event=>{
    if(event.button)return;event.preventDefault();cancelMediaDrag();
    const start={x:event.clientX,y:event.clientY},noteId=currentNote().id;let target=null,moved=false;
    const cleanup=()=>{
      card.style.transform='';card.classList.remove('cut-dragging');showMediaIndicator(null);
      document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);document.removeEventListener('pointercancel',cleanup);document.removeEventListener('keydown',key);
      cancelMediaDrag=()=>{};
    };
    const move=e=>{
      if(!card.isConnected){cleanup();return;}
      if(Math.hypot(e.clientX-start.x,e.clientY-start.y)<4&&!moved)return;
      moved=true;card.classList.add('cut-dragging');
      target=mediaDropTarget(e.clientX,e.clientY,cut.id);showMediaIndicator(target);
      card.style.transform=`translate(${e.clientX-start.x}px,${e.clientY-start.y}px)`;
    };
    const up=()=>{const destination=target?.placement;cleanup();if(moved&&destination)changeMediaLayout('mediaLayoutMove',{noteId,cutId:cut.id,target:destination});};
    const key=e=>{if(e.key==='Escape'){e.preventDefault();cleanup();}};
    cancelMediaDrag=cleanup;document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);document.addEventListener('pointercancel',cleanup);document.addEventListener('keydown',key);
  };
}
