# Specification: Attached sidebar and daily home

- **Specification ID**: 012
- **Date**: 2026-10-15
- **Slug**: attached-sidebar-and-daily-home
- **Status**: In Progress
- **Owner**: App shell (`src/renderer/` shell, sidebar and window buttons), Daily draft context (`src/main/daily-draft/`, home renderer)
- **Related Specification**: [008 — Pipelines](008-2026-10-07-pipelines.md), [009 — Window buttons over modals](009-2026-10-08-window-buttons-over-modals.md), [011 — Related pages settings](011-2026-10-14-related-pages-settings.md)

---

## Context & Background

The window is a drawn book. The sidebar is a separate kraft card with its own border and radius, with a gap between it and the page. The page (`#sheet`) has a book binding (`.book-binding`, dashed stitching) on its left edge. The native traffic lights sit on the paper, right after the binding (`placeWindowButtons`). When a modal is open they move to the window corner (spec 009). The sidebar collapses from a folded paper tab (`#sidebar-toggle`) on the left book edge, and the collapsed state is stored in SQLite (`sidebar_collapsed`).

The home page (Caderninho, spec 008) is a stack of foldable strips, top to bottom: **Última nota** (preview of the latest updated note with its related graph beside it, only when connections exist), **Kanban** (the most recently created pipeline of the active notebook), **Lembretes** and **Últimas notas** (a list). Strip fold state is stored in `settings` (`home_fold_<strip>`). The header shows the day picker, **Nova nota**, the title "Página do dia", the long date and a summary line ("N lembretes · N notas recentes"). The footer shows "Lembretes e notas de todos os cadernos." and the day pager.

The user provided a reference mockup (2026-10-15) and settled the decisions below in grilling rounds. The mockup sets the layout of the rows. Its texts, priorities card, ⌘K badge and colored dots are not part of this specification.

### Decisions settled with the user (2026-10-15)

1. The macOS traffic lights move to the top of the sidebar.
2. The sidebar is attached to the page: no gap, one 1px divider, no rings, binding or stitching.
3. The collapse arrow sits on the right edge of the sidebar and keeps today's hide/show behavior and persistence.
4. With the sidebar collapsed, the traffic lights sit in the top-left corner of the page, and the arrow stays on a narrow strip at the left edge to reopen it.
5. The home page becomes, top to bottom:
   1. **Nota do dia** (daily note): the note editor, inline on the home page.
   2. Two cards side by side: the **related graph** (replacing the latest-note preview) and **Lembretes de hoje**.
   3. **Últimas notas** as a grid of three cards.
   4. **Kanban**: the existing home kanban, unchanged.
6. **Nota do dia**:
   1. It behaves like the new-note editor (blocks, slash menu, formatting). No Enter-to-submit, no title field.
   2. It saves automatically while the user types. The note is created at the first typed character; an untouched field never creates an empty note.
   3. It is a draft that lasts the whole day: the home page keeps showing and updating the same note all day. When the day turns, the field shows a new blank note.
   4. There is one daily note per notebook per day. Switching notebooks saves normally; the field then shows that notebook's daily note (or a blank field). Returning to the original notebook shows its daily note again.
   5. It is an ordinary note from its first character: it appears in Notas, Últimas notas and search, and opens in the normal note page.
   6. If the daily note goes to the trash, the field becomes blank and the next character creates another one.
   7. When midnight passes with the app open, pending edits are saved and the field becomes blank.
   8. The title follows the rule an untitled note follows today.
   9. No new keyboard shortcut.
7. **Related graph card**:
   1. It shows the related graph of the latest updated note of the active notebook (the same note `latestHomeNote` picks today). Editing the daily note makes it the latest note.
   2. It recalculates only after 3 s without typing in the daily note, never on each keystroke. It redraws only when the connections changed.
   3. A ↻ button in the card header forces the recalculation at once.
   4. Without connections the card stays visible with "Sem conexões ainda" and the ↻ button, so the layout does not jump while the user writes.
   5. The note title in the card header opens the note.
8. **Lembretes de hoje**: the same content as today's Lembretes strip, laid out as in the mockup. No "⋮" menu, no location.
9. **Últimas notas**: a grid of three cards (title, excerpt with ellipsis, date and time), wrapping on narrow widths. No "⋯" menu.
10. Every section stays foldable, with its state stored in SQLite.
11. Header: the summary line goes away, and so does the footer sentence "Lembretes e notas de todos os cadernos.". The day picker, **Nova nota**, "Página do dia", the long date and the ‹ › day pager stay. No new texts or taglines.
12. Past days (read-only): the daily note and the related graph appear only on today's page. Past pages keep reminders and recent notes.

---

## Problem Statement

### 1. Writing something down takes a detour

Today the home page shows what exists but has no place to write. Writing means **Nova nota**, a new page, a title. A thought that belongs to the day has no home of its own, and every capture creates one more page to name.

### 2. The latest-note strip duplicates the note page

The home page renders a read-only preview of the latest note. It repeats what the note page shows and takes the space where the user wants to write.

### 3. The sidebar reads as a separate object

The sidebar card, the gap, the binding and the traffic lights placed on the paper make the window read as a sidebar next to a book, not as one Mac window. The collapse tab hangs off the outer book edge, away from the sidebar it controls.

---

## Solution

1. A new **Daily draft** bounded context maps `(notebook, day)` to a note and creates that note on the first typed character. The note itself stays an ordinary note in the existing notes store.
2. The home page hosts an editor instance for the daily note through the shared editor host (`editorHost()`, the same mechanism task editors use, spec 008).
3. The home layout is rebuilt into the four rows above. The kanban row reuses the existing component unchanged.
4. The related graph card debounces its refresh on the renderer side and gets a ↻ that asks the main process to index at once.
5. The shell grid is rebuilt so the sidebar and the page form one block. The traffic lights follow the sidebar, or the page corner when it is collapsed, and the window corner while a modal is open (spec 009 stays).

---

## Practical Gains & Operational Outcomes

1. **Capture**:
   - *Before*: writing needs a new page and a title.
   - *Now*: the user types on the home page. One note per notebook per day collects it, saved as they type.
2. **Context while writing**:
   - *Before*: the related graph appears only when the latest note has connections, beside a preview.
   - *Now*: the graph of what the user is writing sits right below it and updates after a pause, with a manual refresh.
3. **Native window**:
   - *Before*: a sidebar card next to a bound book, traffic lights on the paper.
   - *Now*: one window with an attached sidebar, traffic lights at its top and the collapse arrow on its edge.

---

## User Stories

- [ ] 1. As a user, I want the traffic lights at the top of the sidebar, so that the window looks like a Mac window.
- [ ] 2. As a user, I want the sidebar attached to the page without a gap, binding or rings, so that the app reads as one window.
- [ ] 3. As a user, I want the collapse arrow on the right edge of the sidebar, so that the control sits next to what it hides.
- [ ] 4. As a user, I want the sidebar to stay collapsed or open across launches, as today, so that my layout is kept.
- [ ] 5. As a user, I want the traffic lights in the page's top-left corner while the sidebar is collapsed, so that they are always reachable.
- [ ] 6. As a user, I want a narrow strip with the arrow at the left edge while the sidebar is collapsed, so that I can reopen it.
- [ ] 7. As a user, I want the traffic lights to keep moving above an open modal, so that spec 009 keeps working.
- [ ] 8. As a user, I want to type directly on the home page, so that I can write without creating a page first.
- [ ] 9. As a user, I want the daily note editor to work like the note editor (blocks, slash menu, formatting), so that I do not learn a second editor.
- [ ] 10. As a user, I want what I type saved automatically, so that I never press a button to keep it.
- [ ] 11. As a user, I want no note created until I type, so that visiting the home page does not litter my notebook.
- [ ] 12. As a user, I want the home page to keep the same daily note all day, so that my day's writing stays in one place.
- [ ] 13. As a user, I want a blank daily note when the day turns, so that each day starts clean.
- [ ] 14. As a user, I want one daily note per notebook, so that what I write belongs to the notebook I am in.
- [ ] 15. As a user, I want to switch notebooks and come back to find my daily note there, so that nothing is lost.
- [ ] 16. As a user, I want the daily note to be an ordinary note, so that I find it in Notas, Últimas notas and search and can open it as a page.
- [ ] 17. As a user, I want a blank field after trashing the daily note, so that I can start over.
- [ ] 18. As a user, I want pending text saved when midnight passes with the app open, so that nothing is lost at the day change.
- [ ] 19. As a user, I want the related graph of my latest note next to today's reminders, so that I see connections while I write.
- [ ] 20. As a user, I want the graph to update only after I pause, so that it does not flicker while I type.
- [ ] 21. As a user, I want a ↻ button on the graph, so that I can refresh it at once.
- [ ] 22. As a user, I want the graph card to stay visible with "Sem conexões ainda", so that the layout does not jump.
- [ ] 23. As a user, I want to open the graph's note from the card header, so that I can go to the page.
- [ ] 24. As a user, I want today's reminders in a card beside the graph, so that the day's commitments stay in view.
- [ ] 25. As a user, I want my latest notes as three cards, so that I scan them faster.
- [ ] 26. As a user, I want the kanban to stay at the bottom unchanged, so that my workflow keeps working.
- [ ] 27. As a user, I want every home section foldable and remembered, so that the page shows what I care about.
- [ ] 28. As a user, I want no summary line, taglines or footer sentence, so that the page has only useful content.
- [ ] 29. As a user, I want past days to stay read-only without the daily note or graph, so that history is a snapshot.

---

## Architecture Gate

### 1. Bounded Context & Ubiquitous Language
- **Context**: Daily draft (new). The app shell change is presentation only and has no domain.
- **Package Ownership**:
  - `src/main/daily-draft/domain/`: `daily-draft.cjs` (the `(notebookId, day) → noteId` mapping rules: which mapping counts as current, when a new note is needed) and `ports.cjs`.
  - `src/main/daily-draft/application/`: `open-daily-draft.cjs` (query: today's daily note id for a notebook, or `null`), `start-daily-draft.cjs` (command: create the note and the mapping, or return the existing live one).
  - `src/main/daily-draft/infrastructure/`: `sqlite-daily-draft-repository.cjs` (table and migration; note creation through the existing store without selecting the note).
  - `src/main/daily-draft/presentation/ipc.cjs`: IPC handlers and validation.
  - `src/main/daily-draft/compose.cjs`: wiring, like the other contexts.
  - `src/renderer/home/`: the home page split into one file per section: `home-page.js` (layout, header, day navigation, folding), `daily-draft-editor.js` (editor instance, first-character creation, autosave, day/notebook/trash switching), `home-graph.js` (graph card, debounce, ↻), `home-reminders.js`, `home-recent-notes.js`. The kanban row keeps using `renderKanban` from `src/renderer/pipelines/`.
  - Shell: `src/renderer/index.html`, `shell.css`, `style.css` (sidebar, divider, collapsed strip, removal of `.book-binding`) and `page-actions.js` (`placeWindowButtons`).
- **Ubiquitous Terms**:
  - `Nota do dia` / daily note: the note the home page edits for one notebook on one day.
  - `Rascunho do dia` / daily draft: the mapping `(notebookId, day) → noteId`.
  - `Card de conexões` / graph card: the home section with the related graph of the latest note.

### 2. Aggregate Root & State Transitions
- **Aggregate**: `DailyDraft { notebookId, day, noteId }`.
- **States per (notebook, today)**: `blank` (no mapping, or the mapped note is trashed or purged) → `live` (mapping to a non-trashed note).
  - `blank → live`: `startDailyDraft` on the first typed character.
  - `live → blank`: the note goes to the trash or is purged; the day turns.
  - A restored note becomes `live` again only if it is still the mapping for today's `(notebook, day)`.
- **Invariants**:
  1. At most one mapping per `(notebookId, day)` (primary key).
  2. `day` is computed in the main process with the same `dayKey()` the daily pages use; the renderer never sends a day.
  3. `startDailyDraft` is idempotent: when a live mapping exists it returns that note and creates nothing. Two rapid calls never create two notes (one transaction).
  4. Creating the note and the mapping happens in one SQLite transaction.
  5. Starting a daily draft never changes the selected note, active view or active notebook.
  6. A mapping to a trashed note does not count as live; starting again replaces it with the new note.
  7. The daily note is an ordinary note of type `notes`: every existing rule (limits, trash, search, related indexing, snapshots) applies unchanged.

### 3. Commands, Queries & Domain Ports
```javascript
/** @typedef {{ find(notebookId: string, day: string): { noteId: string, trashed: boolean } | null, start(notebookId: string, day: string): { noteId: string } }} DailyDraftRepositoryPort */
/** @typedef {{ today(): string }} DayClockPort */
/** Query: openDailyDraft({ notebookId }) -> { day, noteId: string | null } */
/** Command: startDailyDraft({ notebookId }) -> { day, noteId, state: snapshot } */
```
- Content writes go through the existing `notebook:action` `note:update` with the note id. The daily draft context only owns the mapping and the creation.
- The snapshot (`notebook:state`) gains `dailyDraft: { day, noteId | null }` for the active notebook, so the home page renders from one state and the day turn and trash cases arrive with the normal snapshot refresh.

### 4. IPC Contract & External Input Validation
| Channel | Preload function | Payload | Result | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `daily-draft:start` | `dailyDraftStart(notebookId)` | `notebookId` (id format, existing notebook) | `{ day, noteId, state }` | `Caderno inválido.`, `Limite de 3.000 páginas atingido.` |
| `related:refresh` | `relatedRefresh()` | none | `void`; `related:updated` fires when the pass ends | `Página inválida.` |
| `notebook:action` (**changed**) | `action('home:fold', …)` | `strip` enum becomes `'draft' \| 'graph' \| 'reminders' \| 'notes' \| 'pipeline'` (`'latest'` removed) | snapshot | `Faixa inválida.` |
| `notebook:state` (**changed**) | — | — | adds `dailyDraft: { day, noteId \| null }` | — |

- Handlers accept only the main window's `webContents`, as every other channel.
- `daily-draft:start` validates the id format and that the notebook exists before calling the use case.
- `related:refresh` runs the indexing pass now (`scheduler.runNow()`), skipping the 1.1 s debounce. While related pages are disabled it does nothing.
- The `notebook:window-buttons` channel is unchanged; only the renderer's position source changes.

---

## Implementation Decisions

1. **Schema**: `daily_drafts(notebook_id TEXT NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE, day TEXT NOT NULL, note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE, created_at TEXT NOT NULL, PRIMARY KEY(notebook_id, day))`. Explicit migration; no backfill. Removing a notebook moves its pages (existing rule) and the cascade drops its mappings.
2. **Fold keys**: `HOME_STRIPS` becomes `draft`, `graph`, `reminders`, `notes`, `pipeline`. The `home_fold_latest` setting is deleted by the migration (no compatibility path).
3. **First character**: the daily note editor starts empty and unbound. The first input that produces non-empty content calls `daily-draft:start`, binds the editor to the returned note id and sends the current document through `note:update`. Input typed while the start call is in flight is kept in the editor and sent with that first update.
4. **Autosave**: the same debounce and flush the note page uses, including flush on close and on quit. The home editor flushes before any notebook switch, view change or day change.
5. **Switching**: the editor rebinds whenever the snapshot's `dailyDraft.noteId` for the active notebook differs from the bound note (notebook switch, trash, day turn). A pending save of the previous note is flushed first.
6. **Day turn**: the existing day-change handling (`onDayUpdated`) triggers the flush and the rebind; the snapshot then reports `noteId: null` for the new day.
7. **Editor features**: the daily note editor is the note editor with the same options as the note page (blocks, slash menu, formatting, hashtags and categories, margin actions, media, diagrams), hosted through `editorHost()`.
8. **Graph refresh**: the home graph listens to `related:updated` as today, but defers any redraw until 3 s after the last input in the daily note editor. The ↻ button calls `related:refresh` and redraws when `related:updated` arrives, ignoring the 3 s wait. The existing signature check keeps redraws to real changes.
9. **Graph empty state**: on today's page the graph card always renders when a latest note exists, with "Sem conexões ainda" when there are no results. Without any note in the notebook the card shows the same empty text.
10. **Últimas notas**: the grid shows the first three entries of `overview.recentNotes`. The daily snapshot keeps storing four, so past pages are unchanged.
11. **Kanban row**: `renderKanban(…, { compact: true, limit: 3 })`, the empty state and the "Abrir pipeline" link stay as they are; only its position changes to last.
12. **Window buttons**: `placeWindowButtons` positions the lights at the sidebar's top-left when it is open, at the page's top-left when it is collapsed, and at the window corner while a modal is open (spec 009). The sidebar reserves the lights' height at its top.
13. **Sidebar shell**: the sidebar and `#sheet` share one outer border and radius. A 1px divider separates them. `.book-binding` is removed. The collapse arrow is a control on the sidebar's right edge. In the collapsed state a narrow strip at the page's left edge holds the arrow. Window dragging from noninteractive areas and resizing from the book edges keep working.
14. **File limits**: every file has one responsibility and stays at or under 250 lines. `home.js` (103 lines) is split into `src/renderer/home/` as listed. `store.cjs` (313 lines) does not grow: the daily draft lives in its own context.
15. **Dependency direction**: the daily draft domain imports nothing from Electron, `node:sqlite`, `fs` or the DOM.

---

## Testing Decisions

Tests assert external behavior through the highest existing seams: the use cases with a temporary SQLite store, the IPC handlers, and the Electron smoke runner.

### Unit Tests (`tests/daily-draft.test.cjs`)
- A missing mapping or one pointing to a trashed note is `blank`; a mapping to an active note is `live`.
- Start is idempotent for a live mapping and replaces a trashed one.

### Integration Tests (`tests/daily-draft-store.test.cjs`, temporary data directory)
- `startDailyDraft` creates one note of type `notes` in the notebook and the mapping in one transaction; a failure rolls back both.
- Two consecutive starts for the same notebook and day return the same note.
- Different notebooks get different notes on the same day; a new day gets a new note.
- Starting does not change the selected note, active view or active notebook.
- Trash, restore and purge of the daily note give the expected `dailyDraft` in the snapshot.
- Migration creates the table and deletes `home_fold_latest`; `home:fold` accepts the new strips and rejects `latest`.

### IPC Contract Tests (`tests/daily-draft-ipc.test.cjs`, plus `tests/related-ipc.test.cjs`)
- `daily-draft:start` rejects other senders, bad ids and unknown notebooks.
- `related:refresh` rejects other senders and runs the pass without the debounce.

### Smoke Tests (`tests/home-smoke.js`, `tests/mac-shell-smoke.js`)
- Home sections in order: daily note, graph + reminders, recent notes, kanban; folding each persists across relaunch.
- Opening home creates no note; typing creates exactly one note in the active notebook, saved without a button; relaunch shows it in the field.
- Switching notebooks shows a blank field; typing creates that notebook's note; switching back shows the first note.
- Trashing the daily note leaves the field blank; typing creates another.
- A day turn (sandbox clock) flushes pending text and shows a blank field.
- The graph does not redraw while typing and redraws after the pause; ↻ redraws at once; "Sem conexões ainda" with no connections.
- No summary line or footer sentence on the home page; past days show neither the daily note nor the graph.
- Sidebar collapse persists; the window-button positions follow open, collapsed and modal states (`notebook:window-buttons` payloads).

### Regression Tests
- `npm test` and the smoke suites (`app`, `home`, `home-preview`, `pages`, `editor`, `notebook`, `related`, `pipelines`, `search`, `undo`, `mac-shell`) pass, updated only where they asserted removed behavior (latest-note strip and preview, summary line, `latest` fold key, binding).

### Visual Verification
- The user compares the running app with the reference mockup layout and approves.

---

## Acceptance Criteria

- [ ] 1. The sidebar is attached to the page with a 1px divider and no binding; the traffic lights sit at its top.
- [ ] 2. The collapse arrow sits on the sidebar's right edge; collapsed, the lights move to the page corner and a left strip reopens the sidebar; the state persists.
- [ ] 3. The home page shows, in order, the daily note, the graph and today's reminders, three recent-note cards and the unchanged kanban.
- [ ] 4. The daily note is created on the first character, autosaves, lasts the day, is one per notebook per day and resets on trash and day turn.
- [ ] 5. The graph refreshes after 3 s without typing and on ↻, and keeps its card with an empty state.
- [ ] 6. No summary line, footer sentence or new taglines on the home page.
- [ ] 7. The running app matches the agreed layout, as verified by the user.
- [ ] 8. All unit, integration, smoke and regression tests pass.
- [ ] 9. Quality checks (`npm test` on Node 22+, `node --check` on changed files, affected smoke tests) pass with 0 errors.

---

## Out of Scope

- "Prioridades do dia" and any priorities card (later specification).
- Locking the Backlog/first column against removal or moves (later specification).
- Any change to the home kanban row (layout, column summaries, colored dots).
- Taglines, handwritten date, ⌘K badge and "⋮"/"⋯" menus from the mockup.
- New keyboard shortcuts, a global quick-capture window or menu item (removed on 2026-10-02 and still out).
- Locations or new reminder actions.

---

## Further Notes

- The mockup in the conversation of 2026-10-15 is a layout reference only; its sample data and texts are not product decisions.
- Notebook paper tabs (`#notebook-tabs`) and the book stack are not mentioned in the decisions and stay as they are.
- The daily note uses the same editor as the note page (Implementation Decision 7); nothing is reimplemented or switched off for the home page (confirmed 2026-10-15).
- The daily draft context owns only the `(notebook, day) → note` mapping and the creation without selection; the note is saved through the existing `note:update` (confirmed 2026-10-15, keeps `store.cjs` from growing).
- Test seams confirmed (2026-10-15): the daily draft use cases over a temporary SQLite store, the two IPC handlers, and the existing `home` and `mac-shell` smoke scenarios. No new seam is introduced.

### Implementation Record

Changes requested by the user after the first visual check (2026-10-15):

- **Binding kept.** The stitched binding (dashed line) stays between the sidebar and the page; it replaces the plain 1px divider of decision 2.
- **Header.** The "Página do dia" / "Página anterior" title is removed; the handwritten date stays, with more space before the first row. The day picker and **Nova nota** are larger on the home page.
- **Collapse tab.** One shape for both states, on the sidebar's right edge when open and in the left strip when collapsed; the arrow direction was inverted at the user's request.
- **Graph card.** Left out when the notebook has no note; compact "Sem conexões ainda" otherwise. Graph and reminders cards share the row height.
- **Recent notes.** Three fixed-height cards in three columns (one column at narrow widths).
- **Daily note editor.** Uses the shared editor instance of the task editors (blocks, slash menu, formatting, tables, own undo). Margin actions, media cards, diagrams and the hashtag pill are not available on the home page; hashtags still become categories when the note is saved. Images are added from the note page.
- **Pre-existing smoke expectations.** The mac-shell smoke expected the Nota menu without "Tela cheia do quadro" (added by spec 007); the expectation now includes it.
- **Second visual check (2026-10-15).** With the sidebar collapsed the traffic lights sit past the binding (page left + 22 + 14 px) and the reopen tab sits on the binding. Toolbar controls share one 34 px height in every section. The minimum window width rises from 620 to 760 px; home rows switch to one column when the home area is 620 px wide or less (container query). Card headings wrap instead of overlapping; the daily note editor has its own padded field.
- **Pre-existing failure.** `selection-smoke.js` fails on `main` too (`Cannot read properties of undefined (reading 'focus')`); the full smoke run stops there, so the suites after it were run with their scoped flags.
- **Modals (supersedes spec 009).** An open modal no longer moves the traffic lights to the window corner, which sat outside the drawn app; they stay at the sidebar top (or past the binding) because native buttons are drawn above the page.
