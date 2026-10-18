const {identifier,validateSaved,restore}=require('../../../shared/media-layout/domain/layout.js');
module.exports=repository=>({noteId,placements})=>{
  if(!identifier(noteId))throw new Error('Nota não encontrada.');
  const saved=validateSaved(placements);
  repository.assertOwnership(noteId,saved.map(item=>item.id));
  return repository.mutate(noteId,items=>restore(items,saved));
};
