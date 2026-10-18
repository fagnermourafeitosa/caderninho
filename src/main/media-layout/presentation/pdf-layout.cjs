const {project}=require('../../../shared/media-layout/domain/layout.js');
// A4 width minus the existing 0.6-inch print margins on each side, in CSS pixels.
const PRINTABLE_WIDTH=(210/25.4-1.2)*96;
function pdfMediaGroups(cuts,renderCard) {
  return project(cuts,PRINTABLE_WIDTH).map(group=>({
    anchor:group.anchor,
    html:`<div class="media-card-group" style="float:${group.float};width:${group.width/PRINTABLE_WIDTH*100}%;${group.float==='left'?'margin-right:18px':group.float==='right'?'margin-left:18px':''}">${group.cards.map(card=>renderCard(cuts.find(cut=>cut.id===card.id),card.pixels)).join('')}</div>`
  }));
}
const printMediaCSS='.media-card-group{display:flex;flex-wrap:wrap;align-items:flex-start;gap:18px;clear:both;max-width:100%;margin-top:14pt;margin-bottom:14pt}.media-card-group figure{flex:none;min-width:0;max-width:100%;margin:0;overflow-wrap:anywhere;break-inside:avoid}.media-card-group img{width:100%;height:auto}table,pre,figure.diagram,.actions{clear:both}';
module.exports={pdfMediaGroups,printMediaCSS};
