const {identifier}=require('../../../shared/media-layout/domain/layout.js');
module.exports=repository=>({noteId})=>{if(!identifier(noteId))throw new Error('Nota não encontrada.');return repository.read(noteId);};
