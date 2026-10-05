# Development

[← Back to Caderninho](../README.md)

Caderninho uses Electron, HTML, CSS and JavaScript. The main process owns the SQLite database and local media storage; the renderer presents the notebooks and the editor.

## Project structure

- `src/main/`: main process, preload, persistence and related-content modules.
- `src/shared/`: modules loaded by both the main process and the renderer.
- `src/renderer/`: `index.html`, styles and renderer scripts.
- `tests/`: unit tests, smoke scenarios and the smoke runner in `tests/smoke/`.
- `scripts/`, `native/`, `assets/`: tooling, the native OCR/PDF helper and static assets.

## Run the project

With Node.js 22 or newer and npm installed:

```sh
npm ci
npm start
```

## Validate changes

```sh
npm test
npm run test:app
```

The app tests drive the real app from an external sandbox (`tests/smoke/sandbox.cjs`): a temporary data folder, separate from personal notebooks, plus replacements for sound, notifications, the related-pages model, the PDF save dialog, the desktop cursor and the editor's native context menu (scripted answers), set through `testHook.configure`. Windows stay hidden and the app never becomes the active one (Chromium focus emulation keeps pages behaving as focused), so a run does not take your keyboard; the copy check still uses the system clipboard and restores it. The app itself has no test mode; `tests/production-boundary.test.cjs` keeps it that way. They cover persistence, editor, selection, media, categories, calendar, reminders and undo/redo.

To run only the native keyboard and mouse scenarios:

```sh
npm run test:app -- --native-only
```

To validate only actions linked to passages and media, including the editor's right-click menu:

```sh
npm run test:app -- --source-only
```

To validate only Mermaid diagram blocks (editor, undo, home preview, clipboard and PDF):

```sh
npm run test:app -- --diagram-only
```

## Mermaid diagrams

`mermaid` is a pinned dev dependency. `scripts/vendor-mermaid.cjs` copies only its self-contained browser build to `src/renderer/vendor/` (git-ignored); it runs automatically before `npm start`, `npm run test:app` and `npm run package`, so the full npm package never enters the app. The drawing style (hand-drawn strokes, notebook palette and handwriting font) lives in `src/shared/diagram-style.js` and is shared by the editor and the PDF print view.

Diagrams use **Excalifont**, Excalidraw's handwriting font, bundled in `src/renderer/fonts/excalifont/` (SIL Open Font License 1.1, see `OFL.txt` there; copied unmodified from `@excalidraw/excalidraw` 0.18.1). `src/renderer/excalifont.css` declares the seven upstream Unicode-range subsets; PDF export copies the same files next to the print page.

## Build the package

```sh
npm run package
```

See [Installing on macOS](INSTALLATION.md) to copy and open the generated app.

## Update the README images

To regenerate the PNG logo and the app icon from `assets/icon.svg`:

```sh
npm run icon
```

On macOS, this command also generates `assets/icon.icns` for the installed package.

To update the screenshots:

```sh
npx electron scripts/capture-readme.cjs
```

To generate only the linked actions and collage screenshots:

```sh
npx electron scripts/capture-readme.cjs --features-only
```

The script uses the real renderer with fictional data in a temporary database. Screenshots are written to `docs/images/`; the temporary folder is removed when it finishes. No personal note is accessed.

Features not yet implemented are recorded in [ROADMAP.md](ROADMAP.md).

## Local connections

Computation is separate from presentation:

- `src/main/related-config.cjs`: category/lexical/semantic weights, threshold, maximum count and pinned model version. Weights are normalized; the initial values still need calibration with real examples.
- `src/main/related-engine.cjs`: searchable documents, signal comparison and ranking restricted to the same notebook. Distance in the graph represents the combined affinity.
- `src/main/related-service.cjs`: queue after saving, SQLite cache by content/model, disposal of old vectors and text extraction from images.
- `src/main/related-worker.cjs`: EmbeddingGemma Q4 on CPU, off the UI thread. Long notes are split and their vectors combined. Uses the symmetric similarity prompt.
- `src/renderer/related-ui.js`: footer and modal, without showing scores. The graph shows up to eight direct connections to the current page; clicking opens the source page.
- `native/ocr.swift`: Apple Vision OCR in Portuguese/English and PDFKit title/excerpt extraction. `prestart` and `prepackage` compile the helper; the distributed app includes the executable and does not require Swift.

The first run downloads the model files to `userData/models`. No text or image is sent for remote inference. After the download, processing works offline. The `related_vectors` and `related_ocr` tables are derived caches; the original content remains in the existing tables.

Optional validation with the real model, including a Portuguese/English pair and an unrelated subject:

```sh
node scripts/check-embedding.cjs
npm run test:app -- --related-only
```

The second command validates the graph with deterministic vectors in a temporary database; it does not measure semantic quality. To build the app on macOS, the development machine needs the Apple command line tools (`swiftc`).

To validate PDF export of notes, lists and reminders with fictional data:

```sh
npm run test:app -- --pdf-only
```

Test PDFs are written to `artifacts/pdf/`; they include large images and link cards with and without a cover. Export uses an isolated WebContentsView with no visible window and a temporary HTML file with embedded local media, without loading network resources.
