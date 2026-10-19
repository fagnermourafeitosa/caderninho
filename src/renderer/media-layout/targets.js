function firstMediaMaskBounds(editor,placement) {
  const bounds=editor.getBoundingClientRect(),available=Math.max(1,editor.clientWidth-8);
  const projected=MediaLayoutDomain.project([{id:'preview',groupId:'preview',position:0,anchor:0,side:placement.side,width:240}],available)[0];
  const measure=document.createElement('div'),group=document.createElement('div'),probe=document.createElement('aside');
  measure.className='note-body collage-editor';Object.assign(measure.style,{position:'fixed',visibility:'hidden',left:bounds.left+'px',top:bounds.top+'px',width:bounds.width+'px',height:'auto',minHeight:'0',maxHeight:'none',flex:'none'});
  group.className='media-card-group';probe.className='paper-cut';probe.dataset.cutId='preview';probe.style.height='180px';group.append(probe);styleMediaGroup(group,projected);measure.append(group);
  try {editor.parentElement.append(measure);const rect=probe.getBoundingClientRect();return {left:rect.left,top:rect.top,width:rect.width,height:rect.height};}
  finally {measure.remove();}
}
function mediaMaskBounds(placement,_box,cutId) {
  const editor=$('#note-body'),note=currentNote(),history=pageHistories.get(note.id);
  if(editor.tagName==='TEXTAREA')return firstMediaMaskBounds(editor,placement);
  const elements=new Map([...editor.querySelectorAll('.paper-cut')].map(card=>[card.dataset.cutId,card]));
  const placements=noteMediaPlacements(history?historyMediaNote(note,history):note).filter(card=>elements.has(card.id)),available=Math.max(1,editor.clientWidth-8);
  const source=elements.get(cutId),height=source?.getBoundingClientRect().height||180;
  let incoming=cutId||'media-preview';
  if(!cutId){while(placements.some(card=>card.id===incoming))incoming+='-';placements.push({id:incoming,groupId:incoming,position:0,anchor:0,side:'right',width:240});}
  const projected=MediaLayoutDomain.project(MediaLayoutDomain.move(placements,incoming,placement),available);
  const original=[...editor.querySelectorAll('.media-card-group')].map(group=>({group,next:group.nextSibling,children:[...group.childNodes]}));
  const styles=new Map([...elements.values()].map(card=>[card,card.style.cssText])),temporary=[],scroll=editor.scrollTop,left=editor.scrollLeft;
  const probe=document.createElement('aside');probe.className='paper-cut';probe.dataset.cutId=incoming;probe.style.height=height+'px';
  try {
    for(const {group} of original)group.remove();
    for(const projectedGroup of projected) {
      const group=document.createElement('div');group.className='media-card-group';group.contentEditable='false';group.style.visibility='hidden';temporary.push(group);
      for(const card of projectedGroup.cards)group.append(card.id===incoming?probe:elements.get(card.id));
      styleMediaGroup(group,projectedGroup);
      editor.insertBefore(group,mediaAnchorLine(editor,editor.value,projectedGroup.anchor)||null);
    }
    const rect=probe.getBoundingClientRect();return {left:rect.left,top:rect.top,width:rect.width,height:rect.height};
  } finally {
    for(const group of temporary)group.remove();
    for(const [card,style] of styles)card.style.cssText=style;
    for(const {group,children} of original)group.replaceChildren(...children);
    for(const {group,next} of original.reverse())editor.insertBefore(group,next);
    editor.scrollTop=scroll;editor.scrollLeft=left;
  }
}
function mediaDropTarget(x,y,excluded) {
  const editor=$('#note-body');if(!editor)return null;
  if(!excluded&&currentNote().cuts.length>=100)return null;
  const bounds=editor.getBoundingClientRect();
  if(x<bounds.left||x>bounds.right||y<bounds.top||y>bounds.bottom)return null;
  const cards=[...editor.querySelectorAll('.paper-cut')].filter(card=>card.dataset.cutId!==excluded).map(card=>({card,box:card.getBoundingClientRect()}));
  const target=(placement,box)=>({placement,box,preview:mediaMaskBounds(placement,box,excluded)});
  for(const {card,box} of cards)if(x>=box.left&&x<=box.right&&y>=box.top&&y<=box.bottom) {
    const edge=y<box.top+box.height*.2?'before':y>box.bottom-box.height*.2?'after':x<box.left+box.width/2?'beside-before':'beside-after';
    return target({kind:'card',cutId:card.dataset.cutId,edge},box);
  }
  const row=cards.filter(({box})=>y>=box.top&&y<=box.bottom).sort((a,b)=>Math.max(a.box.left-x,x-a.box.right,0)-Math.max(b.box.left-x,x-b.box.right,0));
  if(row.length){const {card,box}=row[0];return target({kind:'card',cutId:card.dataset.cutId,edge:x<box.left+box.width/2?'beside-before':'beside-after'},box);}
  const lines=[...editor.querySelectorAll('.writing-line')],line=lines.find(line=>y<line.getBoundingClientRect().bottom)||lines.at(-1);
  return target({kind:'block',anchor:Number(line?.dataset.lineIndex||0),side:x<bounds.left+bounds.width/2?'left':'right'},line?.getBoundingClientRect()||bounds);
}
