// The searchable text of a board: free text, bound labels and frame names, in scene order.
const own = value => typeof value === 'string' && value.trim() ? value : null;

function elementText(element) {
  if (element.isDeleted) return null;
  // originalText is what the person typed; text carries the automatic line wraps.
  if (element.type === 'text') return own(element.originalText) ?? own(element.text);
  if (element.type === 'frame') return own(element.name);
  return null;
}

// Same ceiling as any page body, so a large board does not weigh on every snapshot.
const MAX_TEXT = 200_000;
const sceneText = elements => elements.map(elementText).filter(Boolean).join('\n').slice(0, MAX_TEXT);

module.exports = { sceneText };
