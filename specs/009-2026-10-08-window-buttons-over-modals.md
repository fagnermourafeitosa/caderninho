# Specification: Window buttons over open modals

- **Specification ID**: 009
- **Date**: 2026-10-08
- **Slug**: window-buttons-over-modals
- **Status**: Waiting Approve
- **Owner**: Window chrome (`src/renderer/page-actions.js`)
- **Related Specification**: [003 — Native Mac paper refresh](003-2026-10-04-native-mac-paper-refresh.md), [008 — Pipelines](008-2026-10-07-pipelines.md)

---

## Context & Background

The macOS window buttons (close, minimize, zoom) are native and always drawn above the page. The renderer places them on the paper, right after the binding (`sheet.left + 38`, `sheet.top + 12`), and the main process applies the position with `setWindowButtonPosition`.

---

## Problem Statement

### 1. The window buttons sit in the middle of an open modal

A modal dialog (the task modal from spec 008, and any other `showModal()` dialog) covers the paper. The window buttons stay where the paper starts, so they appear on top of the modal, over the task title. Reported by the user with a screenshot on 2026-10-08.

---

## Solution

1. While any modal dialog is open (`dialog:modal`), the window buttons move to the window corner, `{ x: 16, y: 14 }`, outside the modal.
2. When the last modal closes, they return to the paper position.
3. The renderer watches the `open` attribute of dialogs (`showModal()` and `close()` toggle it), so every modal is covered, not only the task modal.
4. The task modal leaves more room at the top: its maximum height is `100vh - 80px` (was `100vh - 48px`), so it never reaches the buttons in the corner.

The window buttons are never hidden: they are the only way to close the window.

---

## User Stories

- [x] 1. As a user with a task open, I want the window buttons out of the way, so that they do not cover the task title.

---

## Acceptance Criteria

- [x] 1. Opening the task modal sends the window corner position `{ x: 16, y: 14 }`; closing it sends the paper position again (Pipelines smoke test).
- [x] 2. Unit tests pass (212).
- [ ] 3. On macOS, with the task modal open, the window buttons sit in the window corner above the modal, verified by the user.

---

## Out of Scope

- Moving or restyling the modal's own close (×) and more (⋯) buttons.
- Hiding the window buttons.

---

## Implementation Record

- `src/renderer/page-actions.js`: `placeWindowButtons` uses the window corner while `dialog:modal` matches; a `MutationObserver` on the `open` attribute re-places the buttons.
- `src/renderer/pipelines/pipelines.css`: task modal and its two panes use `100vh - 80px` / `100vh - 82px`.
- `tests/smoke/pipelines.cjs`: records `notebook:window-buttons` messages and checks the corner while the modal is open and the paper position after it closes. Run on Linux under Xvfb (the main process applies the position only on macOS; the message is checked).
