# Development

[← Back to Caderninho](../README.md)

Caderninho uses Electron, HTML, CSS and JavaScript. The main process owns the SQLite database and local media storage; the renderer presents the notebooks and the editor.

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

The app tests use a temporary data folder, separate from personal notebooks. They cover persistence, editor, selection, media, categories, calendar, reminders and undo/redo.

To run only the native keyboard and mouse scenarios:

```sh
npm run test:app -- --native-only
```

To validate only actions linked to passages and media:

```sh
npm run test:app -- --source-only
```

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

Features not yet implemented are recorded in [ROADMAP.md](../ROADMAP.md).

## Local connections

Computation is separate from presentation:

- `related-config.cjs`: category/lexical/semantic weights, threshold, maximum count and pinned model version. Weights are normalized; the initial values still need calibration with real examples.
- `related-engine.cjs`: searchable documents, signal comparison and ranking restricted to the same notebook. Distance in the graph represents the combined affinity.
- `related-service.cjs`: queue after saving, SQLite cache by content/model, disposal of old vectors and text extraction from images.
- `related-worker.cjs`: EmbeddingGemma Q4 on CPU, off the UI thread. Long notes are split and their vectors combined. Uses the symmetric similarity prompt.
- `related-ui.js`: footer and modal, without showing scores. The graph shows up to eight direct connections to the current page; clicking opens the source page.
- `native/ocr.swift`: Apple Vision OCR in Portuguese/English and PDFKit title/excerpt extraction. `prestart` and `prepackage` compile the helper; the distributed app includes the executable and does not require Swift.

The first run downloads the model files to `userData/models`. No text or image is sent for remote inference. After the download, processing works offline. The `related_vectors` and `related_ocr` tables are derived caches; the original content remains in the existing tables.

Optional validation with the real model, including a Portuguese/English pair and an unrelated subject:

```sh
node scripts/check-embedding.cjs
npx electron . --smoke-test --related-only
```

The second command validates the graph with deterministic vectors in a temporary database; it does not measure semantic quality. To build the app on macOS, the development machine needs the Apple command line tools (`swiftc`).

To validate PDF export of notes, lists and reminders with fictional data:

```sh
npx electron . --smoke-test --pdf-only
```

Test PDFs are written to `artifacts/pdf/`; they include large images and link cards with and without a cover. Export uses an isolated WebContentsView with no visible window and a temporary HTML file with embedded local media, without loading network resources.
