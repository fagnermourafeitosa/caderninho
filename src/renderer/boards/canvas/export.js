// Board images through Excalidraw's exporters: index thumbnails and the PNG/SVG the person saves.
import { exportToBlob, exportToSvg } from '@excalidraw/excalidraw';

const PAPER = '#fbf0d5';
const THUMBNAIL = { width: 320, height: 200 };

const blobToDataURL = blob => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); });
const visible = api => api.getSceneElements().filter(element => !element.isDeleted);
const appState = { exportBackground: true, viewBackgroundColor: PAPER, exportWithDarkMode: false };

// A small PNG of the whole board, scaled to fit 320×200; null for an empty board.
export async function thumbnailDataURL(api) {
  const elements = visible(api);
  if (!elements.length) return null;
  const blob = await exportToBlob({ elements, files: api.getFiles(), appState, mimeType: 'image/png', exportPadding: 16,
    getDimensions: (width, height) => { const scale = Math.min(THUMBNAIL.width / width, THUMBNAIL.height / height, 1); return { width: Math.round(width * scale), height: Math.round(height * scale), scale }; } });
  return blobToDataURL(blob);
}

// format 'png' returns a data URL, 'svg' returns markup; a frame limits the export to its content.
export async function exportData(api, format, frame = null) {
  const elements = visible(api), files = api.getFiles();
  const options = { elements, files, appState: { ...appState, exportScale: 2 }, exportPadding: frame ? 0 : 24, ...(frame ? { exportingFrame: frame } : {}) };
  if (format === 'svg') return (await exportToSvg(options)).outerHTML;
  return blobToDataURL(await exportToBlob({ ...options, mimeType: 'image/png' }));
}
