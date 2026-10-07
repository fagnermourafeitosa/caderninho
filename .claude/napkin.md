# Napkin Runbook

## Execution & Validation
1. **[2026-10-01] Scope dependency installation to this project**
   Do instead: always set the command working directory to `labs/notepad`; npm otherwise searches ancestor directories for a manifest.
2. **[2026-10-01] Preserve note edits on close**
   Do instead: send edits immediately to the main process and commit SQLite transactions before reporting success.
3. **[2026-10-04] App smoke tests run from an external sandbox**
   Do instead: never add test flags/branches to src/ (guarded by production-boundary test); isolate userData and swap effects (sound, notifications, related scheduling, PDF dialog, cursor) from tests/smoke/sandbox.cjs + testHook.configure before the app is ready.
4. **[2026-10-01] Use native desktop coordinates for window dragging**
   Do instead: sample screen.getCursorScreenPoint in the main process and validate computed signed 32-bit positions before setPosition; captured renderer screenX/screenY can become unreliable while the window moves. Validate actual dragging after packaging.

5. **[2026-10-02] Export PDF from saved page data**
   Do instead: flush current edits, build escaped HTML from the SQLite snapshot with embedded local media, and print in an unattached WebContentsView from a private temporary HTML file, then remove it; do not put HTML with embedded images in a data URL, which fails for large media. Keep page controls out, preserve rich text/list numbering, repeat table headers and set the paper color on @page as well as html/body so margins are colored; check long-page pagination and page corners with rendered PDFs.

## Shell & Command Reliability
1. **[2026-10-04] Default shell node is v10 (nvm)**
   Do instead: run tests with `PATH=~/.nvm/versions/node/v22.23.1/bin:$PATH npm test`; v10 fails with `node: bad option: --test`.
2. **[2026-10-04] Electron 44 clipboard is async**
   Do instead: `await clipboard.readText()/writeText()` in main/tests; restore the user's clipboard after smoke checks.

## Editor
1. **[2026-10-01] One continuous editing host**
   Do instead: keep ordinary writing blocks in the shared contenteditable page; native input targets the host, so resolve the caret block from Selection. Slice rich runs across the complete DOM range for deletion/formatting, including reverse ranges and line-boundary endpoints. Preserve prefix/suffix, SQLite structure and one-step replacement undo; guard caret offsets for detached nodes while constructing checkboxes. Normalize native nodes and route page-boundary carets into writing spans before editing, so plain text never escapes persistence. Validate native sendInputEvent keyboard/mouse selection plus Backspace/Delete, not only synthetic events.

2. **[2026-10-01] Contextual editor without block actions**
   Do instead: provide grouped searchable slash/+ command insertion (300px, 40px rows, ink icons, active yellow, no permanent scrollbar), arrows/Enter/Escape and accent-insensitive aliases, text-selection formatting and an Office-style hover/drag table size grid. Do not add transform/duplicate/move/delete block menus. Save sanitized structured blocks in SQLite alongside searchable plain text, include tables/formatting in undo. Mermaid diagrams are implemented (spec 002); keep them as text blocks.

3. **[2026-10-01] Undo must include the custom paper editor**
   Do instead: use bounded per-page text/title snapshots for textarea and rich checkbox edits, intercept Ctrl/Cmd+Z and redo, route native menus to the same history, retain media/scheduling state, and reset the baseline after external page changes. Keep history session-local and autosave undo results to SQLite.


4. **[2026-10-01] Actions preserve their page context**
   Do instead: persist linked tasks and independent reminder alarms in source_actions, retaining the selected text and stable block/cut origin. Offer selection/menu drag and media creation with an inline collapsible margin, completion dates, edit/reschedule, daily/calendar navigation and typed trash. Resolve edited origins only when unambiguous; keep the original excerpt when removed. Keep margin controls outside contenteditable and verify native editor regressions plus source-action smoke tests. Run Electron smoke processes sequentially: they share a test data directory and desktop focus. Keep permanent origin highlights derived from source_actions, outside saved rich-text marks; reapply after formatting and undo.

5. **[2026-10-02] Selection changes must preserve contextual submenus**
   Do instead: do not rebuild the formatting toolbar for an unchanged DOM range; opening a color palette restores Selection and queues selectionchange. Test separate clicks with an event-loop delay and native mouse input, including link dialog focus. Use sized stroke-only SVG icons for formatting controls.

6. **[2026-10-04] Form fields inside #note-body leak events to the page editor**
   Do instead: stop propagation of input/beforeinput/paste/cut/drop/plain keydown on textareas inside blocks (see diagrams.js) and exclude them from isPageHistoryTarget. Target-phase stopPropagation does NOT stop document capture listeners: page capture handlers (block-editor beforeinput -> ensurePageCaret) and handleWritingKey (Cmd/Ctrl keys still bubble) must skip `#note-body textarea, #note-body input`; Cmd+A reaches the Edit menu selectAll role only if not preventDefault-ed, and sendInputEvent skips menus/Cmd+arrow text commands (assert "not prevented" + call webContents.selectAll()), or moving Selection cancels native Backspace/Delete (typing via `char` still works, so test with native keyDown). Otherwise saves record undo steps and paste is hijacked. Compare Mermaid labels without whitespace (long labels wrap into tspans). Smoke runs hidden in the background (sandbox `runInBackground`: hidden windows, accessory activation policy, CDP focus emulation); never call `win.focus()`/`win.show()` in the runner.

7. **[2026-10-04] Native menus block, so smoke tests script them**
   Do instead: put menu presenters in main `services` and queue answers via `scriptedContextMenu()` in tests/smoke/sandbox.cjs. A native right-click from `sendInputEvent` on an unselected word only places a caret in the hidden smoke window (no macOS word selection); don't assert word selection there.

## Boards (spec 007)
1. **[2026-10-06] Excalidraw 0.18.1 limits decide what the UI can look like**
   Do instead: customise only via props/API/CSS (patching prohibited). Canvas-drawn bits are fixed: frame (#bbb, r8, #999 name), no post-it fold/shadow, no image border, solid selection; selection colour via CSS `--color-selection`. No undo in the imperative API (use native footer, CSS-restyled). Bound labels inherit strokeColor, so transparent-stroke post-its need explicit text colour. `I` = eyedropper, image only `9`, `N` free. Bundle needs esbuild + React and local `EXCALIDRAW_ASSET_PATH`. Spike before promising pixel fidelity.

## Documentation
1. **[2026-10-04] User-facing README and landing page speak PT-BR, product voice**
   Do instead: README and any landing page are in Portuguese (specs/docs stay English per AGENTS.md); lead with ONE idea (notes that turn into tasks without losing context, docs/PRODUCT.md Positioning), then daily history and Portuguese-first, with related pages/collage/diagrams grouped as support; state limits plainly; real screenshots with fictional data. A landing page must look like the app (DESIGN.md tokens, New York/serif stack, Excalifont only as accent, margin action cards) and reuse README wording, not a planning doc full of "pending decisions". Approved direction (2026-10-04): no generic LP grid (split hero, card rows, icon+title columns); a pinned app-drawn notebook driven by scroll that performs the product (select passage -> margin card -> upward page flip to Tarefas -> Voltar à origem -> green done -> daily page/yesterday read-only -> live PT typing), then real screenshots and plain-prose fine print. Draft lived in the session scratchpad (lp/index.html).

2. **[2026-10-04] Recapture README screenshots with the script, then look at every image**
   Do instead: `node scripts/vendor-mermaid.cjs && npx electron scripts/capture-readme.cjs` (Node 22); open each PNG before using it and keep screenshots that show a UI bug out of the README (flag the bug instead). Other sessions may commit on main meanwhile; check `git log` before committing.

3. **[2026-10-04] Landing page mockups can show UI the app lacks**
   Do instead: before treating a site/ illustration as current behavior, grep src/ (e.g. the Tarefa/Lembrete context menu existed only in site/index.html until spec 005).

## User Directives
1. **[2026-10-01] Daily overview and temporal records**
   Do instead: open on Caderninho with the latest updated note from the active notebook and its clickable related graph above the daily panels; show this live section only for today. Render the latest note with the shared editor blocks/media and source highlights in a read-only preview, preserving line breaks and complete content; omit the graph caption and daily writing field from home. Show the related graph beside the note only when connections exist (no empty section); never stack it below the note; the preview never scrolls by itself. Verify icons and labels do not overlap at small widths/heights. Keep pending tasks, today's completions/reminders and recent notes; preserve previous snapshots read-only. Store creation/update/check/uncheck/deletion events, clear deleted_at on restore, keep unknown legacy dates null and omit routine save status from the header; show failures only.

2. **[2026-10-04] Design refresh pending in specs/003 (native Mac paper)**
   Do instead: when 003 is approved it supersedes the rings, drawn traffic lights, grips, Chalkboard labels and illustrated sidebar below; design critique must think macOS-native and avoid generic "AI-looking" UI (glass cards, bento, gradients). Electron 44 cannot reach New York via ui-serif/name; load /System/Library/Fonts/NewYork.ttf through a protocol.
3. **[2026-10-01] Reference style and motion**
   Do instead: use illustrated vintage stationery with unruled writing pages, a narrow vertical icon menu, paper tabs instead of a face/arms (no top ribbon), and an upward page flip when changing notes. Maximize to the available screen height, centered at up to 1200px wide; restore size/position and support top double-click. Resize from the drawn book border (all edges/corners via .book-edges in the .app grid), not only the transparent window edge, plus visible right/bottom/corner grips; resize reads screen.getCursorScreenPoint in main.

4. **[2026-10-01] Three note types and typed trash**
   Do instead: open Lembretes on a navigable month calendar with day bullets and original-page links; keep plain notes, checklist pages, and scheduled note pages separate; each checklist retains its own title, dates, items and checked states. Every page belongs to a notebook; provide Cadernos CRUD below the overview, pastel name/description modal, vertical hover tabs with the active tab held open, and a final + tab. Removing a notebook transfers all pages including trash; retain at least one. Categories are reusable badges below page titles; hashtags in note text become atomic Backspace pills and create associations after the token is finished, with separate manual and inline sources; suggest existing categories after # plus a letter at the caret, with accent-insensitive prefixes, arrows/Enter/Tab/Escape, formatting preservation and a brief bounce respecting reduced motion; remove Themes and Pin; save to SQLite with a one-time JSON migration.

5. **[2026-10-01] Notices follow the stationery design**
   Do instead: use cream paper, dark ink, illustrated borders and readable 16px text for callouts; avoid black banners with white tiny text.

6. **[2026-10-01] Make window dragging discoverable**
   Do instead: allow moving from noninteractive stationery areas without a drag label or header title; preserve inputs, buttons, scrollbars and resize handles.

7. **[2026-10-01] Collapsible sidebar uses the paper design**
   Do instead: attach a folded paper tab to the left book edge, keep window controls on the book, persist collapse in SQLite, and omit the top ribbon until favorites are requested.

8. **[2026-10-02] Quick capture removed at user request**
   Do instead: keep the app without a quick draft button, window, global shortcut or menu; retain legacy settings in SQLite without exposing the removed feature.

9. **[2026-10-01] Adicionar mídia uses local media and metadata-only previews**
   Do instead: retain images and PDFs in userData/media, deduplicate by SHA-256, reference from SQLite cuts, preserve media for trashed cuts, and collect only unreferenced blobs. Link cards read metatags without executing page scripts and cache metadata/images offline. PDF cards use the native PDFKit reader in caderninho-ocr for title/excerpt and open the retained copy with shell.openPath; rebuild the helper before testing or packaging. Text excerpt cards are deferred.

10. **[2026-10-01] Smart margin stays in the note**
   Do instead: offer an explicit date/time stamp without auto-scheduling; keep one absolute alarm on the original note with cancel/re-schedule controls. Render line-start [] as inline checkboxes, preserve [ ]/[x] in SQLite body, and support Enter continuation/exit without affecting task lists or cuts.
