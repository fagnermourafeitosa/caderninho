// Which contextual-bar controls a selection shows, in the order of the reference image ('|' is a separator).
const KINDS = { rectangle: 'shape', diamond: 'shape', ellipse: 'shape', arrow: 'connector', line: 'connector', text: 'text', image: 'image', frame: 'frame', freedraw: 'freedraw' };
const TAIL = ['layer', 'duplicate', 'delete', 'more'];
const CONTROLS = {
  shape: ['fill', 'stroke', '|', 'width', 'lineStyle', 'roughness', 'corners', '|', 'shapeText', '|', ...TAIL],
  connector: ['stroke', '|', 'width', 'lineStyle', 'roughness', '|', 'sharp', 'curve', 'elbow', '|', 'startHead', 'endHead', '|', ...TAIL],
  text: ['textColor', '|', 'fontFamily', 'fontSize', 'alignLeft', 'alignCenter', '|', ...TAIL],
  image: ['opacity', '|', ...TAIL],
  frame: ['rename', '|', 'exportFrame', '|', 'duplicate', 'delete', 'more'],
  several: ['fill', 'width', 'lineStyle', '|', 'alignLeft', 'alignHorizontal', 'alignTop', 'distribute', '|', 'group', 'wrapFrame', '|', ...TAIL],
};

function selectionKind(selected) {
  if (!selected.length) return null;
  if (selected.length > 1) return 'several';
  return KINDS[selected[0].type] || null;
}

// The specification defines no bar for a freehand stroke, so none is shown.
const barControls = kind => CONTROLS[kind] ? [...CONTROLS[kind]] : [];

module.exports = { selectionKind, barControls };
