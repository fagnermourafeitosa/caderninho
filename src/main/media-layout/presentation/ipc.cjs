const {identifier,placement}=require('../../../shared/media-layout/domain/layout.js');
function record(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||!identifier(input.noteId))throw new Error('Posição do recorte inválida.');
  return input;
}
function registerMediaLayout(ipc,layout) {
  for(const [name,method] of [['read','read'],['move','move'],['resize','resize'],['restore','restore']]) {
    ipc.handle('media-layout:'+name,(_event,input)=>layout[method](record(input)));
  }
}
function importPlacement(input,layout) {
  record(input);
  const target=input.placement===undefined?undefined:placement(input.placement);
  const items=layout.read({noteId:input.noteId});
  if(target?.kind==='card'&&!items.some(item=>item.id===target.cutId))throw new Error('Recorte não encontrado.');
  return target;
}
module.exports={registerMediaLayout,importPlacement};
