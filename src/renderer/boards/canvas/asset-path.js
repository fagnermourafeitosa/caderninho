// Excalidraw reads its font location from this global before it loads: point it at the bundled copy.
window.EXCALIDRAW_ASSET_PATH = new URL('vendor/excalidraw/', window.location.href).href;
