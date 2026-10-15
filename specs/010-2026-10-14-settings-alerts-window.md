# Specification: Settings page, alerts and window

- **Specification ID**: 010
- **Date**: 2026-10-14
- **Slug**: settings-alerts-window
- **Status**: Implemented
- **Owner**: Settings context (`src/main/settings/`, `src/renderer/settings/`)
- **Related Specification**: [003 — Native Mac paper refresh](003-2026-10-04-native-mac-paper-refresh.md), [004 — Apple Reminders and Calendar](004-2026-10-04-apple-reminders-calendar.md)

---

## Context & Background

Caderninho has no place where the user changes how the app behaves. The `settings` SQLite table (key/value) already exists, but it only holds interface state the user never sees as a setting: active notebook, selected pages, active view, sidebar collapse and home strip folds.

When a reminder is due, the main process plays `assets/alarm.wav` through `/usr/bin/afplay` at the file's normal level and shows a silent macOS notification (`Notification`, `silent: true`). Both always happen. The only sound control is the "Testar som" button in the reminder schedule panel (`notebook:sound`).

The window uses the Electron default level: other apps cover it. The Window menu is the stock `windowMenu` role.

This specification adds the Settings page and its first two sections, Alerts and Window. Later specifications add their own sections to the same page: 011 (related pages), 012 (language) and 004 (Apple sync), when each is implemented.

---

## Problem Statement

### 1. Reminder alerts cannot be adjusted

Sound and notification always fire together, with one fixed sound at one fixed level. A user who relies on macOS notifications cannot silence the sound, a user without notifications cannot rely on the sound alone, and nobody can pick a quieter or different sound.

### 2. The notebook cannot stay in front

Caderninho is used beside other apps (writing while reading, keeping a checklist visible). macOS has no system-wide "keep on top"; each app offers its own, usually a checked item in the Window menu (Stickies "Float on Top", QuickTime Player). Caderninho has none.

### 3. There is no place for settings

Nothing in the sidebar, the app menu or the `Cmd+,` shortcut leads to settings, which every Mac app provides.

---

## Solution

1. A **Ajustes** view, opened three ways, all leading to the same page inside the notebook:
   - a **Ajustes** item at the bottom of the sidebar, below a separator line, after **Lixeira**;
   - an **Ajustes…** item in the app menu (Caderninho), after **Sobre**;
   - the `Cmd+,` shortcut on that menu item.
2. The page has sections in this order: **Alertas**, **Janela**. Each change saves immediately to SQLite; there is no Save button.
3. **Alertas**:
   - **Modo**: "Som e notificação" (default), "Só som", "Só notificação". Turning both off is impossible by construction: the mode is one of three values.
   - **Som**: "Alarme do Caderninho" (`assets/alarm.wav`, default) or one of the macOS sounds found in `/System/Library/Sounds` (Basso, Blow, Bottle, Frog, Funk, Glass, Hero, Morse, Ping, Pop, Purr, Sosumi, Submarine, Tink on the current macOS). The list is read in the main process; the renderer only sends a sound id.
   - **Volume**: 10–100 % (default 100 %), applied with `afplay -v <volume / 100>`.
   - **Testar som**: plays the chosen sound at the chosen volume. The button stays in the reminder schedule panel too, and both play the saved choice.
   - **Notificações do macOS**: a button that opens the macOS notification settings (`x-apple.systempreferences:com.apple.Notifications-Settings.extension`), with the hint "Se os avisos não aparecerem, envie uma notificação de teste e permita as notificações do Caderninho." The app does not claim to know whether notifications are blocked (decided 2026-10-14, see Decisions Record).
   - **Enviar notificação de teste**: shows a macOS notification titled "Caderninho" with "As notificações do Caderninho estão funcionando." macOS lists an app in its notification settings only after the app posts a notification, so this also makes Caderninho appear there. When notifications are not available, the page shows "Notificações não estão disponíveis neste Mac." (added 2026-10-14, see Decisions Record).
   - Sound and volume controls are disabled when the mode is "Só notificação"; the test notification is disabled when the mode is "Só som".
4. **Janela**:
   - **Manter janela na frente** (default off). When on, the window uses `setAlwaysOnTop(true, 'floating')`: above normal windows, not above full-screen apps.
   - The Window menu gets the same option as a checked item, **Manter na Frente**. Page and menu stay in sync both ways, and the value is restored when the app starts.
5. When a reminder is due, the main process reads the saved alert settings: it plays the sound only in modes with sound, and shows the notification only in modes with notification. The renderer reminder toast keeps working in every mode.

---

## Practical Gains & Operational Outcomes

1. **Alert control**:
   - *Before*: one fixed sound at full level, always with a notification.
   - *Now*: the user picks sound, notification or both, the sound and its volume, and tests the result.
2. **Working beside other apps**:
   - *Before*: the notebook disappears behind the app the user switches to.
   - *Now*: the notebook can float above normal windows, toggled from the page or the Window menu.
3. **Discoverability**:
   - *Before*: no settings entry point.
   - *Now*: the sidebar item, the app menu item and `Cmd+,` all reach one page that later specifications extend.

---

## User Stories

- [x] 1. As a user, I want an **Ajustes** item at the bottom of the sidebar, so that I find the settings without knowing a shortcut.
- [x] 2. As a Mac user, I want **Ajustes…** in the app menu and `Cmd+,`, so that settings open the way they do in every Mac app.
- [x] 3. As a user, I want my changes saved as soon as I make them, so that I never lose a setting by leaving the page.
- [x] 4. As a user who works with macOS notifications, I want "Só notificação", so that reminders do not play a sound.
- [x] 5. As a user without notifications, I want "Só som", so that reminders do not stack in Notification Center.
- [x] 6. As a user, I want to choose the alert sound among the Caderninho alarm and the macOS sounds, so that the alert matches my taste.
- [x] 7. As a user, I want to set the alert volume, so that the alarm is not too loud in a quiet room.
- [x] 8. As a user, I want to test the sound from the settings page and from the schedule panel, so that I hear exactly what the reminder will play.
- [x] 9. As a user, I want a button that opens the macOS notification settings, so that I can allow or change Caderninho notifications.
- [x] 10. As a user, I want to keep the window in front of other apps, from the settings page or the Window menu, so that my notes stay visible while I work elsewhere.
- [x] 11. As a user, I want my alert and window choices restored after restarting the app, so that I set them once.
- [x] 12. As a user, I want to send a test notification, so that Caderninho appears in the macOS notification settings and I see whether notifications arrive.

---

## Architecture Gate

### 1. Bounded Context & Ubiquitous Language
- **Context**: Settings.
- **Package Ownership**:
  - `src/main/settings/domain/`: `preferences.cjs` (the `Preferences` value object, defaults and validation), `alert-plan.cjs` (which effects a due reminder triggers), `ports.cjs` (port shapes).
  - `src/main/settings/application/`: one use case per file: `read-settings.cjs`, `update-settings.cjs`, `test-alert-sound.cjs`, `plan-alert.cjs`, `open-notification-settings.cjs`.
  - `src/main/settings/infrastructure/`: `sqlite-preferences-repository.cjs` (reads/writes the `settings` table), `system-sound-catalog.cjs` (Caderninho alarm + `/System/Library/Sounds`), `afplay-sound-player.cjs` (`execFile` with timeout, `shell.beep` on failure), `electron-window-placement.cjs` (`setAlwaysOnTop`), `macos-notification-settings.cjs` (`shell.openExternal` to the fixed settings URL).
  - `src/main/settings/presentation/ipc.cjs`: payload validation and routing for the `settings:*` channels.
  - `src/main/settings/compose.cjs`: wires adapters into use cases (same pattern as `src/main/pipelines/compose.cjs`).
  - `src/renderer/settings/settings-page.js`, `src/renderer/settings/settings.css`: the page; no rules beyond enabling/disabling controls from the received state.
  - `src/main/main.cjs`: app menu (Ajustes…, Manter na Frente), applies the window level at window creation, calls `planAlert` in the reminder check.
- **Ubiquitous Terms**:
  - `Ajustes` (Settings): the page and its entry points.
  - `Alert mode`: `sound-and-notification` | `sound` | `notification`.
  - `Alert sound`: a sound id from the sound catalog; `caderninho` is the bundled alarm.
  - `Alert volume`: integer 10–100.
  - `Keep on top`: the window floats above normal windows.
  - `Sound catalog`: the sounds the main process can play, as `{ id, label }`.

### 2. Aggregate Root & State Transitions
- **Entities & State Machine**: `Preferences` is a value object, `{ alertMode, alertSound, alertVolume, keepOnTop }`. There is no lifecycle: every update replaces the stored value after validation. Defaults: `{ alertMode: 'sound-and-notification', alertSound: 'caderninho', alertVolume: 100, keepOnTop: false }`.
- **Invariants**:
  - `alertMode` is one of the three modes; no state disables both sound and notification.
  - `alertVolume` is an integer from 10 to 100, so "Só som" can never be silent.
  - `alertSound` is an id present in the sound catalog. A stored id that is no longer in the catalog (a sound removed by a macOS update) reads as `caderninho`.
  - `keepOnTop` is a boolean.
  - An update writes all changed keys in one SQLite transaction.

### 3. Commands, Queries & Domain Ports
```javascript
/** @typedef {{ alertMode: 'sound-and-notification'|'sound'|'notification', alertSound: string, alertVolume: number, keepOnTop: boolean }} Preferences */
/** @typedef {{ preferences: Preferences, sounds: { id: string, label: string }[] }} SettingsView */
/** @typedef {{ read(): Partial<Preferences>, write(changes: Partial<Preferences>): void }} PreferencesRepository */
/** @typedef {{ list(): { id: string, label: string }[], file(id: string): string|null }} SoundCatalog */
/** @typedef {{ play(input: { file: string, volume: number }): void }} SoundPlayer */
/** @typedef {{ setKeepOnTop(on: boolean): void }} WindowPlacement */
/** @typedef {{ open(): Promise<void> }} NotificationSettings */
/** @typedef {{ supported(): boolean, show(input: { title: string, body: string }): void }} NotificationSender */
```
- **Queries**: `readSettings()` → `SettingsView`; `planAlert()` → `{ sound: { file, volume } | null, notification: boolean }`.
- **Commands**: `updateSettings(changes)` → `SettingsView` (applies `keepOnTop` through `WindowPlacement` after the write commits); `testAlertSound()`; `testNotification()` (rejects with `Notificações não estão disponíveis neste Mac.` when unsupported); `openNotificationSettings()`.

### 4. IPC Contract & External Input Validation

| Channel | Preload function | Payload | Result | Errors |
| :--- | :--- | :--- | :--- | :--- |
| `settings:read` | `settings()` | none | `SettingsView` | none |
| `settings:update` | `updateSettings(changes)` | object with 1–4 of `alertMode`, `alertSound`, `alertVolume`, `keepOnTop` | `SettingsView` | `Ajuste inválido.` |
| `settings:test-sound` | `testSound()` | none | `true` | none (player failures beep and are logged) |
| `settings:test-notification` | `testNotification()` | none | `true` | `Notificações não estão disponíveis neste Mac.` |
| `settings:open-notifications` | `openNotificationSettings()` | none | `true` | `Não foi possível abrir os Ajustes do Sistema.` |
| `settings:updated` (main → renderer) | `onSettingsUpdated(callback)` → unsubscribe | `SettingsView` | none | none |

- `notebook:sound` and the preload `sound()` are removed; the schedule panel calls `testSound()`.
- `view:select` accepts the new view `settings`.
- Validation in `presentation/ipc.cjs` (`unknown` → checks → command): payload is a plain object; no keys outside the four; at least one key; `alertMode` in the enum; `alertSound` a string of at most 64 characters that the catalog knows; `alertVolume` an integer 10–100; `keepOnTop` a boolean. Anything else rejects with `Ajuste inválido.`
- `settings:updated` is sent after every update, including the one made from the Window menu, after checking `win.isDestroyed()`.
- The sound catalog accepts only `.aiff` files directly inside `/System/Library/Sounds` whose base name matches `^[A-Za-z0-9 _-]{1,64}$`; ids are base names, never paths.

---

## Implementation Decisions

1. Storage reuses the `settings` table with the keys `alert_mode`, `alert_sound`, `alert_volume`, `keep_on_top`. Missing keys read as defaults; no migration is needed.
2. The page is a view (`activeView = 'settings'`) rendered into `#page-content`, like Lixeira and Cadernos. It has no notebook tabs or page pager.
3. The sidebar item is a separate block at the bottom of the sidebar with a separator line above it, styled with the existing `nav-item` rules and a new `icon-settings` symbol in the same stroke style (1.5 px, round caps).
4. The app menu item `Ajustes…` (`CommandOrControl+,`) sends the existing `notebook:command` with `open-settings`; the renderer selects the `settings` view.
5. The Window menu keeps the standard roles (Minimizar, Zoom, Trazer Todas para a Frente) and adds the checkbox `Manter na Frente`. Its click calls `updateSettings({ keepOnTop })`; the menu is rebuilt after every update so the check mark follows the page.
6. `main.cjs` applies `keepOnTop` when the window is created, before it is shown.
7. The reminder check calls `planAlert()` once per batch of due reminders. The `services.playSound` and `services.notifications` effects stay replaceable by the smoke harness; `playSound` receives `{ file, volume }`.
8. The volume minimum is 10 %: volume 0 in "Só som" would make reminders silent.
9. Files follow the 250-line target; domain files import nothing from Electron, `fs` or `child_process`.

---

## Testing Decisions

Tests check external behavior through the highest seams: the Settings use cases built by `compose.cjs` over a temporary `Store` with fake ports, the IPC validation module, and the Electron smoke runner. Prior art: `tests/pipelines.test.cjs`, `tests/pipelines-ipc.test.cjs`, `tests/smoke/pipelines.cjs`.

### Unit & Profile Tests
- Defaults are returned for a fresh store.
- Each field validates its range and enum; invalid values reject and leave the stored value unchanged.
- A stored sound id missing from the catalog reads as `caderninho`.
- `planAlert` returns sound only, notification only, or both for the three modes, with `volume / 100`.

### Integration & Contract Tests
- `updateSettings` persists after reopening the store; several keys in one call commit together.
- `keepOnTop` changes reach the `WindowPlacement` fake only after the write commits.
- `settings:update` rejects: non-object, empty object, unknown key, wrong types, volume 9, 101 or 20.5, unknown sound, path-like sound id (`../x`).
- The system sound catalog adapter lists only matching `.aiff` names from a temporary directory and never returns paths outside it.

### Error Safety & UI Tests
- Smoke: the sidebar item, the menu command `open-settings` and `Cmd+,` open the page.
- Smoke: changing mode, sound and volume saves and survives a reload of the state; "Testar som" calls `playSound` with the chosen file and volume.
- Smoke: a due reminder in "Só notificação" does not call `playSound`; in "Só som" it does not show a notification.
- Smoke: turning "Manter janela na frente" on makes `win.isAlwaysOnTop()` true, updates the Window menu check, and the reverse.

### Regression Tests
- Existing reminder smoke tests keep passing with the default settings (sound and notification).
- `npm test` and the affected smoke suites pass.

---

## Acceptance Criteria

- [x] 1. The sidebar shows **Ajustes** at the bottom, below a separator line, and it opens the Settings page.
- [x] 2. The app menu shows **Ajustes…** with `Cmd+,`, and it opens the same page.
- [x] 3. The three alert modes control sound and notification as specified.
- [x] 4. The sound list shows the Caderninho alarm and the macOS sounds; the chosen sound and volume are used by reminders and by both "Testar som" buttons.
- [x] 5. The notification settings button opens the macOS notification settings, and the test notification shows a macOS notification.
- [x] 6. **Manter janela na frente** and the Window menu **Manter na Frente** stay in sync and survive a restart.
- [x] 7. All settings survive a restart.
- [ ] 8. All unit, integration and regression tests pass.
- [ ] 9. Quality checks (`npm test` on Node 22+, `node --check` on changed files, affected smoke suites) pass with 0 errors.
- [x] 10. On macOS, sound volume, the notification settings link and the floating window are verified by the user in the running app.

---

## Out of Scope

- Snooze for reminders (rejected on 2026-10-14).
- Custom sound files chosen by the user.
- A keyboard shortcut for keep on top, and floating above full-screen apps.
- A separate settings window.
- Related-page settings (specification 011), language (specification 012), Apple sync settings (specification 004, not implemented).

---

## Decisions Record

1. **2026-10-14, notifications blocked notice**: Electron 44 has no main-process query for the macOS notification authorization status. The page shows only the button to the macOS notification settings plus the hint; no "blocked" notice.
2. **2026-10-14, volume range**: 10–100 %, so "Só som" is never silent.
3. **2026-10-14, test notification**: in the running app, Caderninho did not appear in the macOS notification settings, because macOS lists an app only after its first notification (and a development run is listed as "Electron"). An **Enviar notificação de teste** button was added next to the settings link.

---

## Further Notes

- `afplay -v` takes a linear factor where `1` is the file's normal level; confirm the 10–100 % mapping by ear on macOS before closing criterion 10.
- The Settings page is the anchor for specifications 011, 012 and 004; each adds one section and owns its own controls and IPC channels.

---

## Implementation Record

- **Settings context** `src/main/settings/`:
  - `domain/preferences.cjs` (defaults, value rules, 10–100 % volume), `domain/alert-plan.cjs`, `domain/ports.cjs`.
  - `application/`: `read-settings`, `update-settings`, `apply-window-placement`, `plan-alert`, `test-alert-sound`, `open-notification-settings`.
  - `infrastructure/`: `sqlite-preferences-repository`, `system-sound-catalog`, `afplay-sound-player`, `electron-window-placement`, `macos-notification-settings`.
  - `presentation/ipc.cjs` (sender check, payload shape) and `presentation/menu.cjs` (Ajustes… item, Window menu with Manter na Frente).
  - `compose.cjs`.
- **Main process** `src/main/main.cjs`: composes the context, registers `settings:*`, rebuilds the menu and sends `settings:updated` after every change, applies the window level on window creation, and lets `planAlert` decide sound and notification in the reminder check. `notebook:sound` was removed. `services.playSound` now receives `{ file, volume }`.
- **Store** `src/main/store.cjs`: `view:select` accepts `settings`.
- **Preload**: `settings`, `updateSettings`, `testSound`, `openNotificationSettings`, `onSettingsUpdated` (returns an unsubscribe). `sound` was removed.
- **Renderer**: `src/renderer/settings/settings-page.js` and `settings.css`; sidebar footer with an `icon-settings` symbol in `index.html`; `renderer.js` routes the `settings` view and the schedule panel calls `testSound()`.
- **Tests**: `tests/settings.test.cjs` (use cases over a temporary store), `tests/settings-adapters.test.cjs`, `tests/settings-ipc.test.cjs`, `tests/settings-menu.test.cjs`, a `view:select` case in `tests/store.test.cjs`, the `--settings-only` smoke suite (`tests/smoke/settings.cjs`), and the sidebar count in `tests/app-smoke.js` (7 → 8).
- **Verification (2026-10-14, macOS, Node 22.23.1)**:
  - `npm test`: 236 passing.
  - `node --check` on every changed `.js`/`.cjs` file.
  - Smoke `--settings-only` and `--pipelines-only` pass.
  - The default suite stops at `diagram-smoke.js: Prévia da home desenha o diagrama`, and `--mac-shell-only` stops at the Nota menu expectation that lacks "Tela cheia do quadro". Both fail identically on an untouched checkout of `94c13d8`, so they are not caused by this change. As a result, the schedule panel's "Testar som" (user story 8, checked in `tests/app-smoke.js`) has no passing smoke run yet.

### Deviations

1. Package ownership: two modules not named in the Architecture Gate were added. `application/apply-window-placement.cjs` restores the window level at startup. `presentation/menu.cjs` builds the menu entries, which keeps them out of `main.cjs`.
2. `main.cjs` grows from 289 to 311 lines: above the 250-line evaluation threshold, below the 350-line limit. The additions are wiring only. Splitting the menu and the reminder check out of `main.cjs` would be its own change.
3. A refused sender on any `settings:*` channel answers `Ajuste inválido.`

### Review fixes (2026-10-14)

Each fix started from a failing test.

1. **Nota > Nova nota on the Settings page** created a note of type `settings` and failed with "Tipo inválido.". It now creates a plain note, as on the home page. Covered by the `--settings-only` smoke suite.
2. **Settings unreadable during a reminder**: `planAlert` falls back to the defaults (sound and notification) and logs the error. The reminder is already marked as fired, so the alert is no longer lost and no exception escapes the reminder timer. Covered in `tests/settings.test.cjs`.
3. **Focus on the page**: the page is drawn once. Later changes, including those made from the Window menu, update values and disabled states in place, so the focused control stays and the volume keeps moving with the arrow keys. Covered by the `--settings-only` smoke suite.
4. **Menu check after a failed save**: `menuSettingChange` reports the error and rebuilds the menu, so the check shows the stored value again. Covered in `tests/settings-menu.test.cjs`.

### Test notification (2026-10-14)

- `application/test-notification.cjs` and the `NotificationSender` port. In `main.cjs`, the sender uses `services.notifications` (availability) and a new replaceable effect, `services.showNotification`, which posts a silent `Notification`.
- `settings:test-notification` channel and the preload function `testNotification()`.
- The page shows **Enviar notificação de teste** beside **Abrir ajustes de notificação**. The button is disabled in "Só som". When notifications are unavailable, the page shows the toast "Notificações não estão disponíveis neste Mac."
- Tests: use case (posted / unavailable) in `tests/settings.test.cjs`, the channel in `tests/settings-ipc.test.cjs`, and the smoke suite `--settings-only` (disabled in "Só som", posted, unavailable notice).

### Approval (2026-10-14)

The user verified the Settings page and the test notification in the running app and approved the specification. Still open at approval: the default smoke suite and `--mac-shell-only` stop at failures that predate this change, so the schedule panel's "Testar som" (user story 8) and acceptance criteria 8–9 have no complete smoke run.
- Edited after approval, at the user's explicit request (2026-10-14): the user confirmed in the running app the schedule panel's "Testar som" (user story 8) and criterion 10 (sound volume, notification settings link, floating window). Criteria 8–9 stay open because the default and `--mac-shell-only` smoke suites still stop at failures that predate this change.

