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

## User Directives
1. **[2026-10-01] Daily overview and temporal records**
   Do instead: open on Caderninho with pending tasks, today's completions/reminders, recent notes and daily writing; preserve previous snapshots read-only. Store creation/update/check/uncheck/deletion events including unassociated drafts, clear deleted_at on restore, keep unknown legacy dates null and show autosaving as inline text.

2. **[2026-10-01] Reference style and motion**
   Do instead: use illustrated vintage stationery with unruled writing pages (including Quick draft), a narrow vertical icon menu, paper tabs instead of a face/arms (no top ribbon), and an upward page flip when changing notes. Maximize to the available screen height, centered at up to 1200px wide; restore size/position and support top double-click. Provide edge/corner resize plus a visible right grip.

3. **[2026-10-01] Three note types and typed trash**
   Do instead: open Lembretes on a navigable month calendar with day bullets and original-page links; keep plain notes, checklist pages, and scheduled note pages separate; each checklist retains its own title, dates, items and checked states; remove Themes and Pin; save to SQLite with a one-time JSON migration.

4. **[2026-10-01] Notices follow the stationery design**
   Do instead: use cream paper, dark ink, illustrated borders and readable 16px text for callouts; avoid black banners with white tiny text.

5. **[2026-10-01] Make window dragging discoverable**
   Do instead: allow moving from noninteractive stationery areas without a drag label or header title; preserve inputs, buttons, scrollbars and resize handles.

6. **[2026-10-01] Collapsible sidebar uses the paper design**
   Do instead: attach a folded paper tab to the left book edge, keep window controls on the book, persist collapse in SQLite, and omit the top ribbon until favorites are requested.

7. **[2026-10-01] Quick capture protects unfinished text**
   Do instead: autosave the separate quick draft to SQLite, transfer and clear atomically, preserve existing note content, report shortcut conflicts and provide a button fallback.

8. **[2026-10-01] Adicionar mídia uses local media and metadata-only previews**
   Do instead: retain images in userData/media, deduplicate by SHA-256, reference from SQLite cuts, preserve media for trashed cuts, and collect only unreferenced blobs. Link cards read metatags without executing page scripts and cache metadata/images offline. Text excerpt cards are deferred.

9. **[2026-10-01] Smart margin stays in the note**
   Do instead: offer an explicit date/time stamp without auto-scheduling; keep one absolute alarm on the original note with cancel/re-schedule controls. Render line-start [] as inline checkboxes, preserve [ ]/[x] in SQLite body, and support Enter continuation/exit without affecting task lists or cuts.

10. **[2026-10-01] Undo must include the custom paper editor**
   Do instead: use bounded per-page text/title snapshots for textarea and rich checkbox edits, intercept Ctrl/Cmd+Z and redo, route native menus to the same history, retain media/scheduling state, and reset the baseline after external quick-capture changes. Keep history session-local and autosave undo results to SQLite.
