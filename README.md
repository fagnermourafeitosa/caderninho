# Caderninho

A little desktop notebook for ideas, checklists, reminders, and scraps worth keeping. Caderninho pairs cream paper, a spiral binding, and illustrated paper tabs with automatic local saving.

The app currently uses **Portuguese labels**. This guide includes those labels so you can find each control.

## Open your notebook

Open **Caderninho.app** in Finder. If you are using the copy built in this project, it is in `dist/Caderninho-darwin-arm64/`.

The notebook opens on **Caderninho**, your daily overview. Choose **Notas** (Notes), then **+ Nova nota** (New note), to start a page. Give it a title and start writing. There is no Save button: **Salvando automaticamente…** means your changes are being saved; **Salvo às…** confirms when saving finished.

Use **Suas notas** (Your notes) to browse or search your pages. The arrows at the bottom turn to the previous or next page. Each section has its own list and search.

## Five places for your pages

| Menu | What it holds |
| --- | --- |
| **Caderninho** — Daily page | Today's tasks and reminders, recent notes, and room for daily writing. |
| **Notas** — Notes | Freeform notes, inline checkboxes, images, and link cards. |
| **Tarefas** — Tasks | Separate task lists, each with its own title, dates, and checked or unchecked items. |
| **Lembretes** — Reminders | Notes with a date and time for a sound alert. |
| **Lixeira** — Trash | Removed pages, individual tasks, and scraps, grouped by type. |

### Your daily page

**Caderninho** brings together unfinished tasks from your lists and notes, tasks completed today, today's scheduled reminders, and your latest notes. Check off an item here to update its original page, or click a page title to open it.

Use the writing area for thoughts about the day. Each day has its own automatically saved space. When the date changes, the previous page stays available in the date selector, with its saved overview and writing. Previous days are read-only; **Hoje** (Today) returns to the current page.

### Dates and saving

Pages display their creation and last update times. Tasks keep timestamps for checking and unchecking, and removed items keep their deletion time until restored. Quick drafts keep their own creation and update dates even before they belong to a note. Saving a draft as a new note preserves its creation time.

Dates use your computer's local time zone. Older records may show **não registrado** (not recorded) for dates that were never stored by earlier versions.

### Task lists

In **Tarefas**, click **+ Nova lista** (New list). Add a title, then type a task in the field at the bottom and press **Enter** or **+ Adicionar** (Add). You can edit a task directly and check it off when finished.

Use **Suas listas** (Your lists) to switch between lists. Each list keeps its items, completion states, and creation and update dates. The small squares at the top show your progress.

### Reminders

**Lembretes** opens a monthly calendar. Use the arrows to browse months and **Hoje** (Today) to return to the current month. Bullets mark days with scheduled alerts, including alerts attached to regular notes. Select a day to see its reminders, then click one to open the original page. Unscheduled reminders remain available below the calendar.

Click **+ Novo lembrete** (New reminder) to create a page for the selected day. Write your note and choose **Dia e horário** (Date and time). Click **Agendar** (Schedule) to activate the alert. **Testar som** (Test sound) lets you hear it first. **Calendário** returns to the monthly view.

Changing the date or time cancels the previous schedule until you click **Agendar** again. Use **Cancelar alerta** (Cancel alert) to keep the page without its alarm.

**Keep Caderninho running for alerts to sound; minimizing it is fine.** Closing the notebook quits the app. If an alert becomes due while the app is closed or the computer is asleep, it fires when the app reopens or the computer wakes. Alerts sound once, use your system volume, and also show an in-app message and a system notification when available. Pages in Trash do not trigger alerts.

## The smart margin

Turn a date in a regular note into a reminder without leaving the page. Write a supported **Portuguese** phrase such as:

- `amanhã às 14h` — tomorrow at 2 p.m.
- `hoje às 18h30` — today at 6:30 p.m.
- `depois de amanhã às 9h` — the day after tomorrow at 9 a.m.
- `05/10/2027 às 14:30` — October 5, 2027, at 2:30 p.m. Dates use day/month/year.

A small **Agendar** stamp offers the interpreted date and time. Check it before clicking: typing alone never activates an alarm. Each note can have one scheduled alert. **Reagendar** (Reschedule) replaces it, and the × beside the scheduled time cancels it.

The time follows your computer's local time zone. After scheduling, the date is fixed; “tomorrow” does not shift each day. The same alert rules apply as in **Lembretes**. English date phrases are not currently recognized.

### Checkboxes inside notes

Start a line with `[]` or `[ ]` to turn it into a checkbox. Click the square to mark it done and strike through its text.

- **Enter** creates the next checkbox.
- **Enter** on an empty checkbox returns to ordinary text.
- **Backspace** at the start of an item removes its checkbox and keeps its text.
- Pasting several lines beginning with `[ ]` creates several items.
- Write `\[]` if you want the brackets to stay literal.

These items belong to the note; they do not create a separate list in **Tarefas**.

## A scrapbook on the page

In **Notas**, click **+ Adicionar mídia** (Add media), paste an image or a single web link into the note body, or drag image files and links onto the page. Supported images are **PNG, JPEG, and WebP**, up to **20 MB** each.

Scraps look like pieces of paper held with tape. Drag their **Arraste** (Drag) handle to choose a paragraph and the left or right side. Use **− / +** to change their width. Text wraps around smaller scraps and continues below larger ones. Placement follows paragraphs rather than a freeform canvas.

Link cards capture a site's title, description, and preview image from its page metadata. Creating a preview needs an internet connection; once captured, the card and its image remain available offline. Clicking the card opens the original link in your browser.

Some sites provide no useful metadata or require a login. Those links still appear as cards you can open, but may have no preview. Cards are saved snapshots, not live webpages, and do not refresh automatically. Text-excerpt cards are not currently available.

## Capture an idea without switching apps

With Caderninho running, press **⌘ Shift Space** on Mac or **Ctrl Shift Space** on other systems to open **Rascunho instantâneo** (Quick draft), a small window above your current app. You can also use **Rascunho** (Draft) at the top of the notebook or **Caderno → Rascunho instantâneo** in the menu.

Write your idea, optionally add a title, and choose **Nova nota** (New note) or an existing note. Click **Guardar no caderno** (Keep in notebook), or press **⌘/Ctrl Enter**, to save it as a new page or append it to the selected page.

The unfinished draft saves automatically. Closing its window or pressing **Escape** keeps it for later. After saving, **Abrir a nota no caderno** (Open the note in the notebook) takes you to that page.

If another app owns the shortcut, use the notebook's Draft button instead.

## Undo and keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| Undo | **Ctrl Z** or **⌘ Z** |
| Redo | **Ctrl/⌘ Shift Z**, or **Ctrl Y** |
| New page in the current section | **Ctrl/⌘ N** |
| Search pages in the current section | **Ctrl/⌘ F** |
| Open Quick draft | **⌘ Shift Space** on Mac; **Ctrl Shift Space** elsewhere |
| Keep a Quick draft in the notebook | **Ctrl/⌘ Enter** |
| Close the page list or hide Quick draft | **Escape** |

For **Notas**, undo history covers the title, text, and inline checkboxes separately for each note during the current app session. It resets when you quit or when Quick draft appends content to that page. Scrap changes and alert scheduling are not part of that history. Other text fields use their usual text-editing undo.

## Make the notebook comfortable

Drag a noninteractive part of the notebook's top, paper, or sidebar to move the window. Drag an edge or corner to resize it; the marked grip on the right adjusts its width.

The red button closes the app, the yellow button minimizes it, and the green button expands the notebook to the screen's available height, centered with a width of up to 1,200 pixels. Double-click the top of the notebook to expand it too. Click green or double-click the top again to restore the previous size and position.

Click the folded paper tab on the left edge to collapse or reopen the sidebar. Caderninho remembers that preference.

## Restore something you removed

**Mover para a lixeira** (Move to Trash) keeps a page recoverable. Individual task items and scraps also go to Trash when removed.

Open **Lixeira**, choose **Notas**, **Tarefas**, or **Lembretes**, and click **Restaurar** (Restore). A restored page keeps its content, task states, and scraps. A restored overdue reminder needs to be scheduled again.

**Excluir definitivamente** (Delete permanently) asks for confirmation and permanently removes the selected item. A scrap's saved image stays on disk while another page or recoverable scrap still uses it.

## Your data and backups

Notes, task lists, reminders, and drafts save locally in SQLite. Images are copied into Caderninho's own media folder, so you can move or delete the original image file after importing it. There is no cloud sync or account sign-in. Writing and viewing saved pages works offline; fetching a new link preview contacts the linked website.

On Mac, your data is in:

```text
~/Library/Application Support/caderninho/
```

To make a complete backup:

1. Wait for **Salvo às…**, then close Caderninho.
2. Copy the entire `caderninho` data folder to your backup location.
3. Keep both **`notebook.sqlite`** and the **`media`** folder together. The database alone does not include your images.

To restore a backup, close the app first, keep a copy of your current data folder, and replace it with the backed-up folder before reopening Caderninho.

If you see **Falha ao salvar** (Save failed), check available disk space and access to the data folder before closing the app. Do not delete database support files while it is running.
