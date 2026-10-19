(function(root) {
  const invalid = () => { throw new Error('Posição do recorte inválida.'); };
  const identifier = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  function placement(value) {
    if (!value || typeof value !== 'object') return invalid();
    if (value.kind === 'block' && Number.isInteger(value.anchor) && value.anchor >= 0 && value.anchor <= 10000 && ['left','right'].includes(value.side)) return {kind:'block',anchor:value.anchor,side:value.side};
    if (value.kind === 'card' && identifier(value.cutId) && ['before','after','beside-before','beside-after'].includes(value.edge)) return {kind:'card',cutId:value.cutId,edge:value.edge};
    return invalid();
  }
  function groups(items) {
    const result = new Map();
    for (const item of items) {
      if (!result.has(item.groupId)) result.set(item.groupId, []);
      result.get(item.groupId).push({...item});
    }
    return [...result.values()].map(group => group.sort((a,b) => a.position-b.position)).sort((a,b) => a[0].anchor-b[0].anchor);
  }
  function move(items, cutId, destination) {
    const target = placement(destination), result = items.map(item => ({...item}));
    const moving = result.find(item => item.id === cutId);
    if (!moving) throw new Error('Recorte não encontrado.');
    if (target.kind === 'card' && target.cutId === cutId) return result;
    const other = target.kind === 'card' ? result.find(item => item.id === target.cutId) : null;
    if (target.kind === 'card' && !other) throw new Error('Recorte não encontrado.');
    const oldGroup = moving.groupId;
    const remaining = result.filter(item => item.groupId === oldGroup && item.id !== cutId).sort((a,b) => a.position-b.position);
    remaining.forEach((item,i) => { item.position=i; });
    let singleton=moving.id,index=0;
    while(result.some(item=>item.id!==cutId&&item.groupId===singleton))singleton=moving.id.slice(0,110)+'-group-'+(++index);
    if (target.kind === 'block') Object.assign(moving,{groupId:singleton,position:0,anchor:target.anchor,side:target.side});
    else if (target.edge.startsWith('beside')) {
      const members = result.filter(item => item.groupId === other.groupId && item.id !== cutId).sort((a,b) => a.position-b.position);
      const index = members.indexOf(other)+(target.edge === 'beside-after' ? 1 : 0);
      members.splice(index,0,moving);
      members.forEach((item,i) => Object.assign(item,{groupId:other.groupId,position:i,anchor:other.anchor,side:other.side}));
    } else {
      const anchor = other.anchor + (target.edge === 'after' ? 1 : 0);
      for (const item of result) if (item.id !== cutId && item.anchor >= anchor) item.anchor++;
      Object.assign(moving,{groupId:singleton,position:0,anchor,side:other.side});
    }
    return validateSaved(result);
  }
  function resize(items,cutId,width) {
    if(!Number.isInteger(width)||width<180||width>600)throw new Error('Largura do recorte inválida.');
    if(!items.some(item=>item.id===cutId))throw new Error('Recorte não encontrado.');
    return items.map(item=>item.id===cutId?{...item,width}:{...item});
  }
  function validateSaved(values) {
    if(!Array.isArray(values)||values.length>100)return invalid();
    const seen=new Set();
    return values.map(value=>{
      if(!value||!identifier(value.id)||!identifier(value.groupId)||seen.has(value.id)||!Number.isInteger(value.position)||value.position<0||value.position>99||!Number.isInteger(value.width)||value.width<180||value.width>600)return invalid();
      placement({kind:'block',anchor:value.anchor,side:value.side});seen.add(value.id);
      return {id:value.id,groupId:value.groupId,position:value.position,anchor:value.anchor,side:value.side,width:value.width};
    });
  }
  function restore(items,values) {
    const saved=validateSaved(values),result=items.map(item=>({...item,...saved.find(value=>value.id===item.id)}));
    const historicalIds=new Set(saved.map(item=>item.id));
    for(const group of groups(result)) {
      const historical=group.filter(item=>historicalIds.has(item.id)),retained=group.filter(item=>!historicalIds.has(item.id));
      if(!historical.length||!retained.length)continue;
      const first=historical[0],fixed=retained[0];
      if(historical.some(item=>item.anchor!==first.anchor||item.side!==first.side))return invalid();
      if(first.anchor===fixed.anchor&&first.side===fixed.side)continue;
      let index=0,groupId;
      do {groupId=first.groupId.slice(0,110)+'-restore-'+(++index);}while(result.some(item=>item.groupId===groupId));
      for(const item of historical)result.find(value=>value.id===item.id).groupId=groupId;
    }
    for(const group of groups(result)) {
      const historical=group.filter(item=>historicalIds.has(item.id));
      const retained=group.filter(item=>!historicalIds.has(item.id));
      const first=group[0];
      if(group.some(item=>item.anchor!==first.anchor||item.side!==first.side))return invalid();
      const ordered=new Array(group.length);
      retained.forEach((item,i)=>{ordered[Math.min(item.position,group.length-retained.length+i)]=item;});
      let historicalIndex=0;
      for(let i=0;i<ordered.length;i++) {
        if(!ordered[i])ordered[i]=historical[historicalIndex++];
        result.find(value=>value.id===ordered[i].id).position=i;
      }
    }
    return result;
  }
  function project(items,available) {
    return groups(items).map(cards=>{
      const gap=18,width=Math.min(available,cards.reduce((sum,card)=>sum+card.width,0)+gap*(cards.length-1));
      const float=available-width-gap>=220?cards[0].side:'none';
      return {groupId:cards[0].groupId,anchor:cards[0].anchor,side:cards[0].side,width,float,cards:cards.map(card=>({...card,pixels:Math.min(available,card.width)}))};
    });
  }
  const api={identifier,placement,groups,move,resize,validateSaved,restore,project};
  if(typeof module==='object'&&module.exports) module.exports=api; else root.MediaLayoutDomain=api;
})(typeof window==='object'?window:globalThis);
