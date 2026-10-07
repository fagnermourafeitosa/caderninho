// "Em frame": a new frame around the selection, with the selected elements (and their labels) inside it.
import { CaptureUpdateAction, convertToExcalidrawElements, getCommonBounds, newElementWith } from '@excalidraw/excalidraw';

const PADDING = 16;

export function wrapInFrame(api, selected) {
  const [minX, minY, maxX, maxY] = getCommonBounds(selected);
  const [frame] = convertToExcalidrawElements([{ type: 'frame', x: minX - PADDING, y: minY - PADDING, width: maxX - minX + PADDING * 2, height: maxY - minY + PADDING * 2, children: [] }]);
  const inside = new Set(selected.map(element => element.id));
  const elements = api.getSceneElementsIncludingDeleted();
  for (const element of elements) if (element.containerId && inside.has(element.containerId)) inside.add(element.id);
  api.updateScene({
    elements: [...elements.map(element => inside.has(element.id) ? newElementWith(element, { frameId: frame.id }) : element), frame],
    appState: { selectedElementIds: { [frame.id]: true } },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
}
