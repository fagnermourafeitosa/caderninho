// The searchable text of a board: free text, bound labels and frame names, in scene order.
const own = value => typeof value === 'string' && value.trim() ? value : null;

function elementText(element) {
  if (element.isDeleted) return null;
  // originalText is what the person typed; text carries the automatic line wraps.
  if (element.type === 'text') return own(element.originalText) ?? own(element.text);
  if (element.type === 'frame') return own(element.name);
  return null;
}

const sceneText = elements => elements.map(elementText).filter(Boolean).join('\n');

module.exports = { sceneText };
