// Post-it defaults, and the rule that keeps a label readable inside a shape with no outline.
const POST_IT_INK = '#303025';
const WIDTH = 140, HEIGHT = 120;

const postItSkeleton = ({ x, y }) => ({ type: 'rectangle', x: x - WIDTH / 2, y: y - HEIGHT / 2, width: WIDTH, height: HEIGHT, backgroundColor: '#f6d77a', fillStyle: 'solid', strokeColor: 'transparent', strokeWidth: 2, strokeStyle: 'solid', roughness: 0, roundness: null });

// Excalidraw gives a new bound label its container's stroke colour; a transparent one would hide the text.
function invisibleLabels(elements) {
  const byId = new Map(elements.map(element => [element.id, element]));
  return elements.filter(element => element.type === 'text' && !element.isDeleted && element.containerId && element.strokeColor === 'transparent' && byId.get(element.containerId)?.strokeColor === 'transparent').map(element => element.id);
}

module.exports = { postItSkeleton, invisibleLabels, POST_IT_INK };
