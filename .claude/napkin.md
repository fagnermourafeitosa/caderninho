# Napkin Runbook

## Execution & Validation
1. **[2026-10-01] Scope dependency installation to this project**
   Do instead: always set the command working directory to `labs/notepad`; npm otherwise searches ancestor directories for a manifest.
2. **[2026-10-01] Preserve note edits on close**
   Do instead: send edits immediately to the main process and commit SQLite transactions before reporting success.
3. **[2026-10-01] Isolate app smoke tests**
   Do instead: use a separate temporary userData directory before requesting the instance lock; never overwrite real notes.
4. **[2026-10-01] Use native desktop coordinates for window dragging**
   Do instead: sample screen.getCursorScreenPoint in the main process and validate computed signed 32-bit positions before setPosition; captured renderer screenX/screenY can become unreliable while the window moves. Validate actual dragging after packaging.

5. **[2026-10-02] Export PDF from saved page data**
   Do instead: flush current edits, build escaped HTML from the SQLite snapshot with embedded local media, and print in an unattached WebContentsView from a private temporary HTML file, then remove it; do not put HTML with embedded images in a data URL, which fails for large media. Keep page controls out, preserve rich text/list numbering, repeat table headers and set the paper color on @page as well as html/body so margins are colored; check long-page pagination and page corners with rendered PDFs.

## Editor
1. **[2026-10-01] One continuous editing host**
   Do instead: keep ordinary writing blocks in the shared contenteditable page; native input targets the host, so resolve the caret block from Selection. Slice rich runs across the complete DOM range for deletion/formatting, including reverse ranges and line-boundary endpoints. Preserve prefix/suffix, SQLite structure and one-step replacement undo; guard caret offsets for detached nodes while constructing checkboxes. Normalize native nodes and route page-boundary carets into writing spans before editing, so plain text never escapes persistence. Validate native sendInputEvent keyboard/mouse selection plus Backspace/Delete, not only synthetic events.

2. **[2026-10-01] Contextual editor without block actions**
   Do instead: provide grouped searchable slash/+ command insertion (300px, 40px rows, ink icons, active yellow, no permanent scrollbar), arrows/Enter/Escape and accent-insensitive aliases, text-selection formatting and an Office-style hover/drag table size grid. Do not add transform/duplicate/move/delete block menus. Save sanitized structured blocks in SQLite alongside searchable plain text, include tables/formatting in undo. Mermaid remains planned in ROADMAP.md until requested.

3. **[2026-10-01] Undo must include the custom paper editor**
   Do instead: use bounded per-page text/title snapshots for textarea and rich checkbox edits, intercept Ctrl/Cmd+Z and redo, route native menus to the same history, retain media/scheduling state, and reset the baseline after external page changes. Keep history session-local and autosave undo results to SQLite.


4. **[2026-10-01] Actions preserve their page context**
   Do instead: persist linked tasks and independent reminder alarms in source_actions, retaining the selected text and stable block/cut origin. Offer selection/menu drag and media creation with an inline collapsible margin, completion dates, edit/reschedule, daily/calendar navigation and typed trash. Resolve edited origins only when unambiguous; keep the original excerpt when removed. Keep margin controls outside contenteditable and verify native editor regressions plus source-action smoke tests. Run Electron smoke processes sequentially: they share a test data directory and desktop focus. Keep permanent origin highlights derived from source_actions, outside saved rich-text marks; reapply after formatting and undo.

5. **[2026-10-02] Selection changes must preserve contextual submenus**
   Do instead: do not rebuild the formatting toolbar for an unchanged DOM range; opening a color palette restores Selection and queues selectionchange. Test separate clicks with an event-loop delay and native mouse input, including link dialog focus. Use sized stroke-only SVG icons for formatting controls.

## Documentation
1. **[2026-10-01] User-facing Portuguese README**
   Do instead: lead with actual features and local storage, emphasize no cloud upload or accounts; explain link-preview website requests accurately and avoid design commentary in the opening.

## User Directives
1. **[2026-10-01] Daily overview and temporal records**
   Do instead: open on Caderninho with pending tasks, today's completions/reminders, recent notes and daily writing; preserve previous snapshots read-only. Store creation/update/check/uncheck/deletion events, clear deleted_at on restore, keep unknown legacy dates null and show autosaving as inline text.

2. **[2026-10-01] Reference style and motion**
   Do instead: use illustrated vintage stationery with unruled writing pages, a narrow vertical icon menu, paper tabs instead of a face/arms (no top ribbon), and an upward page flip when changing notes. Maximize to the available screen height, centered at up to 1200px wide; restore size/position and support top double-click. Provide edge/corner resize plus a visible right grip.

3. **[2026-10-01] Three note types and typed trash**
   Do instead: open Lembretes on a navigable month calendar with day bullets and original-page links; keep plain notes, checklist pages, and scheduled note pages separate; each checklist retains its own title, dates, items and checked states. Every page belongs to a notebook; provide Cadernos CRUD below the overview, pastel name/description modal, vertical hover tabs with the active tab held open, and a final + tab. Removing a notebook transfers all pages including trash; retain at least one. Categories are reusable badges below page titles; hashtags in note text become atomic Backspace pills and create associations after the token is finished, with separate manual and inline sources; suggest existing categories after # plus a letter at the caret, with accent-insensitive prefixes, arrows/Enter/Tab/Escape, formatting preservation and a brief bounce respecting reduced motion; remove Themes and Pin; save to SQLite with a one-time JSON migration.

4. **[2026-10-01] Notices follow the stationery design**
   Do instead: use cream paper, dark ink, illustrated borders and readable 16px text for callouts; avoid black banners with white tiny text.

5. **[2026-10-01] Make window dragging discoverable**
   Do instead: allow moving from noninteractive stationery areas without a drag label or header title; preserve inputs, buttons, scrollbars and resize handles.

6. **[2026-10-01] Collapsible sidebar uses the paper design**
   Do instead: attach a folded paper tab to the left book edge, keep window controls on the book, persist collapse in SQLite, and omit the top ribbon until favorites are requested.

7. **[2026-10-02] Quick capture removed at user request**
   Do instead: keep the app without a quick draft button, window, global shortcut or menu; retain legacy settings in SQLite without exposing the removed feature.

8. **[2026-10-01] Adicionar mídia uses local media and metadata-only previews**
   Do instead: retain images in userData/media, deduplicate by SHA-256, reference from SQLite cuts, preserve media for trashed cuts, and collect only unreferenced blobs. Link cards read metatags without executing page scripts and cache metadata/images offline. Text excerpt cards are deferred.

9. **[2026-10-01] Smart margin stays in the note**
   Do instead: offer an explicit date/time stamp without auto-scheduling; keep one absolute alarm on the original note with cancel/re-schedule controls. Render line-start [] as inline checkboxes, preserve [ ]/[x] in SQLite body, and support Enter continuation/exit without affecting task lists or cuts.

10. **[2026-10-02] Local related content stays modular**
   Do instead: keep ranking weights/thresholds in related-config.cjs, inference/OCR in a worker and the graph in related-ui.js. Cache by content hash and pinned model version, restrict results to the same notebook, omit scores in the UI, order footer links by descending affinity and use equal graph axis scales so radial distance preserves that order, and keep the compact toolbar usable. Validate real embeddings separately from deterministic graph smoke fixtures.
