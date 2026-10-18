const {move}=require('../../../shared/media-layout/domain/layout.js');
module.exports=repository=>({noteId,cutId,target})=>{
  repository.initialize(noteId,items=>move(items,cutId,target??{kind:'block',anchor:0,side:'right'}));
};
