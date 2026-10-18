const {identifier,resize}=require('../../../shared/media-layout/domain/layout.js');
module.exports=repository=>({noteId,cutId,width})=>{
  if(!identifier(noteId)||!identifier(cutId))throw new Error('Posição do recorte inválida.');
  return repository.mutate(noteId,items=>resize(items,cutId,width));
};
