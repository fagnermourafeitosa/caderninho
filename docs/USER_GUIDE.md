# User guide

[← Back to the Caderninho overview](../README.md)

The app interface is in Portuguese. Labels are shown in bold exactly as they appear in the app, followed by their English meaning in parentheses.

## Start here

Open **Caderninho.app**. The first screen, **Caderninho**, brings together your pending tasks, today's reminders, latest notes and a preview of the notebook's most recently updated note, with its connection graph.

To write, open **Notas** (Notes): it opens on the list of your notes. Click a note to open it, or **+ Nova nota** (New note) to start one. Give it a title and start. Changes are saved automatically on your computer. If something fails, the app shows a notice.

## Search across all notebooks

Click the **magnifying glass at the top**, right after the main button, or press **⌘F**. The field opens and searches titles and content of notes, lists and reminders in all notebooks, regardless of the open section. Search ignores differences in accents and letter case; pages in the trash are left out.

Each result shows the page type, the notebook and an excerpt of the content. Click to open it, or use **↑/↓** and **Enter**. **Escape** collapses the field.

## Notebooks

**Cadernos** (Notebooks), the second menu item, is where you create, open, edit and remove notebooks. Each one has a name, an optional description and a color chosen from the palette.

There is always at least one notebook. On first launch, **Meu caderno** (My notebook) receives your existing pages. Every note, task list or reminder belongs to a notebook, and new pages are created in the selected notebook.

The tabs on the right let you switch notebooks. On hover, the tab opens and reveals the name vertically. The selected tab stays open, showing which notebook you are in. The last tab, **+**, opens the creation form.

On the page itself, the notebook name below the title, next to the dates, lets you move a note, list or reminder to another notebook. When removing a notebook, you choose another one to receive all its pages, including those in the trash. No page is deleted by this operation, and the last notebook cannot be removed.

## What you can keep

| Section | Purpose |
| --- | --- |
| **Caderninho** | Daily overview, bringing together tasks, reminders and latest notes from all notebooks. |
| **Cadernos** (Notebooks) | Create, edit, open and remove notebooks. |
| **Notas** (Notes) | Free text, categories, checkboxes, images and link cards. |
| **Tarefas** (Tasks) | Several independent lists, with title, dates and checked or pending items. |
| **Lembretes** (Reminders) | Notes scheduled for a day and time to play a sound alert. |
| **Lixeira** (Trash) | Removed pages, tasks and media, separated by type and recoverable. |

**Notas**, **Tarefas** and the **Lembretes** calendar show the selected notebook. The daily overview and the trash bring together all notebooks. Alerts keep working even when you are in another notebook.

### Daily page

See pending tasks, items completed today, today's alerts and latest notes. Checking a task here updates its original page. Click a title to open the corresponding page.

At the top of today's page, the notebook's latest note appears with its formatting and media. When it has connections, **Ideias por perto** (Nearby ideas) shows them beside it as a graph. Use **Continuar nesta nota** (Continue in this note) to edit it, or click a connection to open another page. The next day, the previous page's summary remains available in the date picker. Previous days are read-only; choose **Hoje** (Today) to return to the current day.

### Categories

Below the title, click **+ Categoria** (Category) to use an existing category or create a new one. The same category can be used across notebooks and page types.

Type `#trabalho` or `#ideias` in a note's text to create a pill and associate the category with the page. Finish the word with a space or punctuation, or leave the editor, to register it. Hashtags in task items also associate categories with the list.

When you type `#` and the first letter, suggestions from existing categories appear, matched regardless of accents or letter case. Use **↑/↓** to choose and **Enter** or **Tab** to complete, or click the category. **Escape** closes the suggestions without changing the text. They open with a short bounce, disabled when you prefer reduced motion.

**Backspace on a pill removes the whole category from the text**, keeping the surrounding words. Undo restores the pill and its association. The saved text keeps the original hashtag, so you can copy it to other apps.

The **×** on a badge removes an association made through the picker. If the category also appears in the text, it stays associated until you remove the hashtag. Categories remain registered for reuse.

Names accept letters, accents, numbers, hyphens and underscores; spaces become hyphens. Escaped hashtags, hashtags inside code or inside link addresses do not create categories.

### Task lists

In **Tarefas** (Tasks), click **+ Nova lista** (New list). Give it a title, write an item in the bottom field and press **Enter** or **+ Adicionar** (Add). You can edit items and check them as you complete them.

**Tarefas** opens on the index of your lists; search there by content and click a list to open it. The arrow at the top left returns to the index. Each list keeps its own items, completion states and dates. The progress indicator shows how many items have been completed.

### Reminders and calendar

**Lembretes** (Reminders) opens the monthly calendar of the selected notebook. The arrows move between months; **Hoje** (Today) returns to the current month. Dots mark days with scheduled alerts, including those attached to regular notes. Select a day and click a reminder to open its original page.

Click **+ Novo lembrete** (New reminder), write the note, choose **Dia e horário** (Day and time) and click **Agendar** (Schedule). **Testar som** (Test sound) lets you hear the alert. **Cancelar alerta** (Cancel alert) keeps the page without its schedule.

Changing the date or time disables the previous schedule until you click **Agendar** again.

**The app must be open to play the alert; it can be minimized.** Closing the window quits the app. If the time passes while the app is closed or the computer is asleep, the alert fires when the app opens or the computer wakes up. Each alert plays once, uses the system volume and shows a message in the app and a system notification, when available. Pages in the trash do not fire alerts.

## Note editor

Type **`/`** in the text to insert text, **Título** (Title), **Subtítulo** (Subtitle), **Título pequeno** (Small title), checkbox tasks, bulleted or numbered lists, quote, divider, code, media or table. The palette groups blocks under **Texto** (Text), **Listas** (Lists), **Estrutura** (Structure) and **Mídia** (Media), with search. Keep typing after the slash to filter: **`/tit`** shows the three title levels. Search accepts words without accents. Use the arrows and **Enter** to choose; **Escape** closes the menu.

Select a passage to open the formatting bar: **bold, italic, underline, strikethrough, inline code, link and highlighter**. Selecting with **Shift + arrows** crosses paragraphs. Formatting applies to all selected text, including across several lines or cells. **Backspace/Delete** erase the whole selection; next to a divider, they remove the block. At the start of a title, quote or list, Backspace returns to normal text without losing content. The highlighter uses a six-color palette. To open a link in the text, use **⌘/Ctrl + click**.

### Tables

Choose **Tabela** (Table) in the insert menu. The grid previews **columns × rows** as you hover. Click the desired size, or press, drag and release to create the table. The initial picker allows up to 8 × 8; afterwards you can add rows and columns, up to 20 × 20.

Write directly in the cells. **Tab** moves forward; **Shift Tab** moves back. Tab in the last cell adds a row. **Enter** breaks the line inside the cell. The table controls let you add a row or column, toggle the header and remove the table.

Tables, formatting and blocks are saved automatically to the local database. **Undo/redo** also recovers these changes. Existing notes remain available, and adding media keeps the formatting already saved.

## Shortcuts inside the note

Write a date such as `amanhã às 14h` (tomorrow at 2 pm), `hoje às 18h30` (today at 6:30 pm), `depois de amanhã às 9h` (the day after tomorrow at 9 am) or `05/10/2027 às 14:30`. An **Agendar** (Schedule) stamp offers the interpreted time. Check the date before clicking: writing the phrase alone does not activate the alert.

Each note can have one alert. **Reagendar** (Reschedule) replaces the time; the **×** next to the schedule cancels it. Dates follow the computer's time zone and, once scheduled, stay fixed.

Start a line with `[]` or `[ ]` to create a checkbox inside the note:

- Click to check or uncheck.
- **Enter** creates the next checkbox.
- **Enter** on an empty item returns to normal text.
- **Backspace** at the start of the item removes the checkbox and keeps the text.
- Paste several lines with `[ ]` to create several items.
- Use `\[]` to keep the brackets as text.

These items belong to the note and do not create a separate list in **Tarefas**.

## Images, PDFs and links

In **Notas**, use **Adicionar mídia** (Add media) in the **⋯** menu or press **⇧⌘M**, paste an image or a link into the text, or drag images, PDFs and links onto the page. Accepted files are **PNG, JPEG and WebP** images up to **20 MB** each, and **PDF** documents up to **50 MB**.

Use the **Arraste** (Drag) handle to position the media next to a paragraph, on the left or the right. The **− / +** buttons adjust the width; the text follows the media position.

Link cards keep the title, description and image obtained from the site's metatags. Once created, the preview is available offline. Clicking the card opens the address in the browser. Sites without metadata or that require sign-in may appear without a preview. Cards do not update automatically.

PDFs appear as cards with a title and an initial excerpt, when available. Without extractable text, the card uses the file name. Click **Abrir PDF** (Open PDF) to open the saved copy in the computer's PDF reader.

Imported images and PDFs are copied to the app's data folder. You can move or delete the original file after importing it.

## Export to PDF

Open a note, task list or reminder and choose **Exportar PDF** (Export PDF) in the **⋯** menu at the top of the page, or press **⇧⌘E**. Choose the name and folder in the Mac dialog.

The A4 PDF includes title, notebook, categories, dates, formatted text, tables, checkboxes, images, link cards, attached PDFs and actions linked to the page. Long pages continue on further sheets, with page numbers. Export saves the latest changes before generating the file and works locally, without internet.

## Keyboard and window

| Action | Shortcut |
| --- | --- |
| Undo | **Ctrl Z** or **⌘ Z** |
| Redo | **Ctrl/⌘ Shift Z** or **Ctrl Y** |
| New page in the current section | **⌘ N** |
| Search all notebooks | **⌘ F** |
| Add media to a note | **⇧⌘ M** |
| Related pages | **⌥⌘ R** |
| Export PDF | **⇧⌘ E** |
| Move page to the trash | **⇧⌘ ⌫** |
| Close a menu | **Escape** |

The page actions are also in the **Nota** menu of the menu bar, enabled when the open page offers them.

In notes, the undo history includes title, text, pills and checkboxes, kept per page during the session. It resets when you close the app. Moving media and scheduling alerts are not part of this history.

Drag a non-editable area of the notebook to move the window, and drag the notebook's border to resize it. The window uses the Mac's own buttons: red closes, yellow minimizes and green enlarges the window to the available height, with a width of up to 1,200 pixels. Double-clicking the top also enlarges or restores it.

The paper tab on the left collapses or opens the side menu. This preference is saved.

## Dates and trash

Pages show when they were created and updated. Tasks record checks and unchecks; removed items keep their deletion date until restored. Data from older versions may show **não registrado** (not recorded) when the date did not exist.

**Mover para a lixeira** (Move to the trash), in the **⋯** menu at the top of the page or with **⇧⌘⌫**, moves the page to the trash and keeps it recoverable. Task items and media can also be restored in **Lixeira** (Trash), separated by type. Restoring keeps content, notebook, categories and task states. An overdue reminder must be scheduled again.

**Excluir definitivamente** (Delete permanently) asks for confirmation and erases the item permanently. Images and PDFs stay on disk while another page or recoverable media still uses them.

## Your data stays on your computer

The app uses **SQLite** to store notes, notebooks, lists, categories and reminders. Images and PDFs live in a local media folder. There is no account, no upload of pages to a server and no cloud sync.

On a Mac, data lives in:

```text
~/Library/Application Support/caderninho/
```

To make a full backup:

1. Wait for **Salvo às…** (Saved at…) and close the app.
2. Copy the whole `caderninho` folder to the backup location.
3. Keep `notebook.sqlite` and the `media` folder together: the database alone does not contain the images.

To restore, close the app, keep a copy of the current folder and replace it with the backup folder before opening the app again.

If **Falha ao salvar** (Failed to save) appears, check free disk space and folder permissions before closing the app. Do not remove the database's auxiliary files while the app is open.

## Actions linked to the page

Select a passage in a note and click the **task icon** in the formatting menu. You can also drag that button to the margin. On images and link cards, use the **task icon** in the media control strip.

Choose **Tarefa** (Task) or **Lembrete** (Reminder), write your next step and, for a reminder, set the day and time. Creating it does not modify the original text or create a second note. A single page can have several actions and several independent alerts.

- Passages with actions get a soft, permanent dashed highlight. Completing the task turns the highlight green.
- The margin keeps the actions together with a copy of their context. Use the arrow next to **Ações desta nota** (Actions in this note) to collapse it.
- Tasks also appear on the Daily page and in **Tarefas**, under **Da margem das notas** (From note margins) for the current notebook.
- Reminders appear in the calendar and on the Daily page of their scheduled day. The app must be open to play the alert.
- **Ver origem** (View origin) and **Voltar à origem** (Back to origin) open the note and highlight the passage or media.
- The pencil lets you edit the task or reschedule the reminder. Completion leaves a stamp with the date; unchecking keeps the history.
- If the origin changes or is removed, the copy of the passage remains available and the margin warns when it cannot locate the content.
- The **×** button moves the action to the task or reminder trash, where it can be restored. Removing the action preserves the original note.

In the form, **Esc** cancels and returns the text selection. Nothing is created until you confirm with **Criar tarefa** (Create task) or **Agendar lembrete** (Schedule reminder).

## Connections between pages

After autosave, Caderninho looks for relationships between notes, tasks and reminders in the same notebook. Up to two connections fade in at the footer, after **Relacionados:** (Related). Click a title to open the source page. When there is no relevant relationship, it stays empty.

Use **Relacionados** in the **⋯** menu, or **⌥⌘R**, to open the graph. The current page sits at the center; content with higher affinity sits closer. Click a connection to open its source page. In narrow windows, the button shows only the icon, with the name on hover.

The calculation combines categories, shared words and the meaning of the text. On a Mac, text found in images also contributes. Pages and images are not sent for analysis in the cloud. The first use needs internet to download the model; after that, analysis works locally.
