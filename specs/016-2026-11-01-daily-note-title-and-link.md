# Specification: Untitled daily note and link to the note

- **Specification ID**: 016
- **Date**: 2026-11-01
- **Slug**: daily-note-title-and-link
- **Status**: Implemented
- **Owner**: Daily draft context (`src/main/daily-draft/`, `src/renderer/home/daily-draft-editor.js`)
- **Related Specification**: [012 — Attached sidebar and daily home](012-2026-10-15-attached-sidebar-and-daily-home.md)

---

## Context & Background

Specification 012 added the **Nota do dia** box on the home page: an inline editor that creates an ordinary note on the first typed character and saves as the user types. Rule 6.8 of 012 says the title "follows the rule an untitled note follows today", which the implementation resolved as the default title `Nova nota`. The box header has only the fold chevron and the label; the only way to open the daily note is to find it in Notas or Últimas notas.

The user asked (2026-11-01) for three changes to the daily note:

1. The note must not get a title automatically; a title exists only when the user sets one.
2. Deleting a selected passage with the Mac delete key (⌫) after selecting it with Shift + arrows does not work.
3. A small "go to note →" link at the top of the box.

This specification supersedes rule 6.8 of specification 012. Specification 012 stays unchanged as a historical record.

---

## Problem Statement

### 1. The daily note gets a title the user never wrote

`startDailyDraft` creates the note with the title `Nova nota`. Every daily note appears as "Nova nota" in Notas, Últimas notas, search and the related graph, a name the user never chose.

### 2. No direct way from the box to the note page

The box edits the note inline but offers no way to open it in the normal note page (title, media, diagrams, margin actions).

### 3. Deleting a selection in the box

The user reports that ⌫ on a passage selected with Shift + arrows does nothing. The Electron smoke tests (hidden window, emulated focus) do not reproduce it: selecting with Shift + ←/→, Shift + ⌥ + ←, Shift + ⌘ + ←/↑, Shift + ↑ across lines and the mouse, then pressing Backspace or Delete, removes the passage and saves it. The root cause is not identified yet; see **Further Notes**.

---

## Solution

1. The daily note is created with an empty title. Every view already shows an empty title as "Sem título". The user sets a title explicitly on the note page.
2. The box header shows a small **Ir para nota →** link on the right, always visible. Before the first character it is disabled (there is no note yet). Once the note exists it is enabled; clicking it saves any pending edit, then opens the daily note on the note page.
3. A regression smoke test drives real Backspace/Delete keys over passages selected with Shift + arrows and the mouse in the box.

---

## Practical Gains & Operational Outcomes

1. **Explicit titles**:
   - *Before*: every daily note is named "Nova nota".
   - *Now*: the daily note is untitled ("Sem título") until the user writes a title.
2. **Navigation**:
   - *Before*: the daily note is opened only from lists.
   - *Now*: one click in the box header opens it.

---

## User Stories

- [x] 1. As a writer, I want the daily note to have no title until I write one, so that my notes are not all called "Nova nota".
- [x] 2. As a writer, I want a small link in the daily note box that opens the note page, so that I can add a title, media or diagrams.
- [x] 3. As a writer, I want the link to show before I type, disabled, so that the header does not change while I write.
- [x] 4. As a writer, I want my last keystrokes saved before the note page opens, so that nothing is lost.
- [ ] 5. As a writer, I want ⌫ to delete a passage I selected with Shift + arrows, so that I can edit the daily note like any other note.

---

## Architecture Gate

### 1. Bounded Context & Ubiquitous Language
- **Context**: Daily draft (existing, spec 012). No new context.
- **Package Ownership**:
  - `src/main/daily-draft/infrastructure/sqlite-daily-draft-repository.cjs`: creates the daily note (title becomes empty).
  - `src/renderer/home/daily-draft-editor.js`: box header link (presentation only).
- **Ubiquitous Terms**:
  - `Nota do dia` / daily note: the note mapped to `(notebook, day)`.
  - `Ir para nota`: the header link that opens the daily note on the note page.

### 2. Aggregate Root & State Transitions
- Unchanged: `DailyDraft { notebookId, day, noteId }`, `blank → live` on the first character.
- The link state follows the aggregate: disabled while `blank`, enabled while `live`.
- **Invariants**: the daily note is created with `title = ''`. Opening it from the link never loses a pending edit.

### 3. Commands, Queries & Domain Ports
- Unchanged. The link uses the existing `note:select` action after `flushHomeDraft()`.

### 4. IPC Contract & External Input Validation
- No channel added or changed. `daily-draft:start` returns the same shape; the created note's title is now `''`.

---

## Implementation Decisions

1. `SqliteDailyDraftRepository.createNote` inserts `title: ''`.
2. The draft strip passes the link as the strip `meta` (`button.daily-link[data-home-draft-open]`, label "Ir para nota", arrow icon), consistent with the graph card's header link. `disabled` while the draft has no note id; `saveHomeDraft` enables it once `daily-draft:start` returns.
3. Click: `await flushHomeDraft()`, then `action('note:select', { id })` and `render()`, the same path as the other home links.
4. No new file; `daily-draft-editor.js` stays under 250 lines. Dependencies unchanged.

---

## Testing Decisions

### Integration Tests (`tests/daily-draft-store.test.cjs`)
- `startDailyDraft` creates the note with an empty title.

### Electron Smoke (`tests/home-smoke.js`, `tests/smoke/run.cjs`, `npm run test:app -- --home-only`)
- Before typing, the box header has the **Ir para nota** link, disabled.
- After the first character it is enabled; clicking it opens the note page with the daily note selected and the typed text saved.
- Real Backspace and Delete keys remove a passage selected with Shift + → and with the mouse, and the note saves the result.

### Regression Tests
- The existing `npm test` suite and the home smoke scenario keep passing.

---

## Acceptance Criteria

- [x] 1. A new daily note has an empty title and shows "Sem título" in lists.
- [x] 2. The box header shows **Ir para nota →**, disabled before the note exists and enabled after.
- [x] 3. Clicking it saves pending edits and opens the daily note page.
- [ ] 4. ⌫ deletes a passage selected with Shift + arrows in the box, confirmed by the user in the running app.
- [x] 5. All unit, integration and smoke tests pass.
- [x] 6. Quality checks (`npm test` on Node 22+, `node --check` on changed files) pass with 0 errors.

---

## Out of Scope

- A title field inside the box.
- Renaming existing daily notes already called "Nova nota".

---

## Further Notes

- The deletion report could not be reproduced in the smoke runner. Its hidden window bypasses native menu accelerators and real window focus, which are the remaining differences from the running app. The root cause will be recorded here once the user's exact steps reproduce it.
- Approved by the user on 2026-11-01 and released. Acceptance criterion 4 and user story 5 (⌫ over a Shift + arrows selection) remain open: the report is not reproduced yet, and its fix belongs to a new specification once the user's exact steps reproduce it.
