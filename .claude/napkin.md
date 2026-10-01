# Napkin Runbook

## Execution & Validation
1. **[2026-10-01] Scope dependency installation to this project**
   Do instead: always set the command working directory to `labs/notepad`; npm otherwise searches ancestor directories for a manifest.
2. **[2026-10-01] Preserve note edits on close**
   Do instead: send edits immediately to the main process and commit SQLite transactions before reporting success.
3. **[2026-10-01] Isolate app smoke tests**
   Do instead: use a separate temporary userData directory before requesting the instance lock; never overwrite real notes.

## User Directives
1. **[2026-10-01] Reference style and motion**
   Do instead: use illustrated vintage stationery, a narrow vertical icon menu, paper tabs instead of a face/arms (no top ribbon), and an upward page flip when changing notes. Keep maximize vertical only and provide edge/corner resize plus a visible right grip.

2. **[2026-10-01] Three note types and typed trash**
   Do instead: keep plain notes, checklist pages, and scheduled note pages separate; each checklist retains its own title, dates, items and checked states; remove Themes and Pin; save to SQLite with a one-time JSON migration.

3. **[2026-10-01] Notices follow the stationery design**
   Do instead: use cream paper, dark ink, illustrated borders and readable 16px text for callouts; avoid black banners with white tiny text.

4. **[2026-10-01] Make window dragging discoverable**
   Do instead: show a labeled drag grip and allow moving from noninteractive stationery areas; preserve inputs, buttons, scrollbars and resize handles.

5. **[2026-10-01] Collapsible sidebar uses the paper design**
   Do instead: attach a folded paper tab to the left book edge, keep window controls on the book, persist collapse in SQLite, and omit the top ribbon until favorites are requested.

6. **[2026-10-01] Quick capture protects unfinished text**
   Do instead: autosave the separate quick draft to SQLite, transfer and clear atomically, preserve existing note content, report shortcut conflicts and provide a button fallback.

7. **[2026-10-01] Recortes use local media and metadata-only previews**
   Do instead: retain images in userData/media, deduplicate by SHA-256, reference from SQLite cuts, preserve media for trashed cuts, and collect only unreferenced blobs. Link cards read metatags without executing page scripts and cache metadata/images offline. Text excerpt cards are deferred.
