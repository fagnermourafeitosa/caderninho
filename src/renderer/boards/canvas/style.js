// Bar choices turned into Excalidraw element properties: [elementId, patch] pairs for updateScene.
const SHAPES = new Set(['rectangle', 'diamond', 'ellipse']);
const STROKED = new Set(['rectangle', 'diamond', 'ellipse', 'arrow', 'line', 'freedraw']);
const LINEAR = new Set(['arrow', 'line']);
const WIDTHS = { Fina: 1, Média: 2, Grossa: 4 };
const LINE_STYLES = { Contínua: 'solid', Tracejada: 'dashed', Pontilhada: 'dotted' };
const HEADS = { Nenhuma: null, Seta: 'arrow', Triângulo: 'triangle', Círculo: 'circle', Barra: 'bar' };
// Excalidraw roundness types: 2 proportional (diamonds, curved lines), 3 adaptive (rectangles).
const CORNERS = { rectangle: { type: 3 }, diamond: { type: 2 } };
const freeText = element => element.type === 'text' && !element.containerId;

const RULES = {
  width: { applies: element => STROKED.has(element.type), patch: (_element, value) => ({ strokeWidth: WIDTHS[value] }) },
  lineStyle: { applies: element => STROKED.has(element.type), patch: (_element, value) => ({ strokeStyle: LINE_STYLES[value] }) },
  stroke: { applies: element => STROKED.has(element.type), patch: (_element, value) => ({ strokeColor: value }) },
  fill: { applies: element => SHAPES.has(element.type), patch: (_element, value) => ({ backgroundColor: value }) },
  fillPattern: { applies: element => SHAPES.has(element.type), patch: (_element, value) => value === 'Vazio' ? { backgroundColor: 'transparent' } : { fillStyle: value === 'Hachura' ? 'hachure' : 'solid' } },
  opacity: { applies: () => true, patch: (_element, value) => ({ opacity: value }) },
  roughness: { applies: element => STROKED.has(element.type), patch: element => ({ roughness: element.roughness > 0 ? 0 : 1 }) },
  corners: { applies: element => Boolean(CORNERS[element.type]), patch: element => ({ roundness: element.roundness ? null : CORNERS[element.type] }) },
  startHead: { applies: element => element.type === 'arrow', patch: (_element, value) => ({ startArrowhead: HEADS[value] }) },
  endHead: { applies: element => element.type === 'arrow', patch: (_element, value) => ({ endArrowhead: HEADS[value] }) },
  sharp: { applies: element => LINEAR.has(element.type), patch: () => ({ roundness: null }) },
  curve: { applies: element => LINEAR.has(element.type), patch: () => ({ roundness: { type: 2 } }) },
  textColor: { applies: freeText, patch: (_element, value) => ({ strokeColor: value }) },
  alignLeft: { applies: freeText, patch: () => ({ textAlign: 'left' }) },
  alignCenter: { applies: freeText, patch: () => ({ textAlign: 'center' }) },
};

function stylePatches(selected, control, value) {
  const rule = RULES[control];
  return rule ? selected.filter(rule.applies).map(element => [element.id, rule.patch(element, value)]) : [];
}

module.exports = { stylePatches, WIDTHS, LINE_STYLES, HEADS };
