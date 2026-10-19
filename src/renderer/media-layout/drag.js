let cancelMediaDrag=()=>{};
function showMediaIndicator(target) {
  document.querySelector('.media-insertion-indicator')?.remove();
  if(!target)return;
  const marker=document.createElement('div'),box=target.preview;
  marker.className='media-insertion-indicator';marker.setAttribute('aria-hidden','true');
  marker.style.left=box.left+'px';marker.style.top=box.top+'px';
  marker.style.width=box.width+'px';marker.style.height=box.height+'px';
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
