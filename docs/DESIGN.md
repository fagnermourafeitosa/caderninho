# Design system

## Scene
A person writes and plans on a Mac during the day, in a paper notebook that behaves like a native Mac window: the content leads, the chrome recedes.

## Tokens
Defined on `:root` in `style.css`: paper #fbf0d5, paper shade #efe0b9, kraft #e6d3a8 (sidebar), raised sheet #fffaea (menus, dialogs, notices), hover #f3e5c2, hairline #cdb88a, ink #303025, muted ink #6b624c (5.3:1 on paper), edge #36352a and selection yellow #f8d985. Pastel notebook colors remain selectable.

Type scale: 12px metadata, 13px controls and labels, 15px secondary text, 17px writing, 22px section headings, 28px page titles. Weights 400, 600 and 650/700.

## Typography
New York, Apple's serif, for writing, titles and interface labels. Electron cannot resolve it by name, so `fonts.css` loads it at runtime from the macOS system files through the read-only `caderno-font://` protocol; it is never shipped with the app. Excalifont, the hand already used by diagrams, appears in exactly two accents: the date of the daily page and the notebook tab names. Hierarchy comes from size, weight and color, not from a second face. Dates keep Portuguese casing; only a line start is capitalized.

## Surfaces
Three paper layers, back to front: kraft for the sidebar, paper for the page, raised sheet for the command palette, popovers, menus, dialogs and notices. Raised sheets use a 1px hairline border and a short soft shadow instead of thick ink outlines. The book keeps its 2px ink outline, a stitched binding on its left edge and a page stack below; there are no spiral rings.

## Color discipline
Yellow means "selected": active sidebar row, selected palette option, selected calendar day, selected suggestion. Hover darkens the paper. Today on the calendar is an ink ring. Checked boxes show an ink check on paper. Primary buttons are ink with paper text. Destructive actions turn red only on hover or inside their menu; disabled destructive actions use muted ink at reduced opacity.

## Components
- **Window**: native macOS traffic lights, positioned on the paper right after the binding and moved with the sidebar. No drawn window controls or resize grips; the book border resizes.
- **Sidebar**: a Mac source list, 176px, 32px rows with 16px stroke icons and 13px labels, headed by the active notebook name. The folded paper tab on the book edge (16×46px, thin chevron) collapses it.
- **Icons**: one stroke set, 1.5px ink on a 20px grid, rendered at 16–20px. Illustrations appear only in empty states.
- **Toolbar**: no page title beside the traffic lights. Left: navigation only (an icon-only back chevron, the day picker). Right, packed with 6px: the single primary action, global search, then "Mais" (⋯) for secondary actions with their shortcuts.
- **Notes and lists**: open on an index (title, count, search, rows). The note header reads title, categories, then a muted provenance line with the notebook picker and dates.
- **Command palette**: 300px wide, 40px options, search, category headings, yellow selection, stroke icons and a small keyboard hint.
- **Notices**: a raised sheet centered on the notebook, 14px text.
- **Scrolling**: diagrams and the daily note preview never scroll by themselves (the preview clips with a fade). Page and list scrollbars appear only on hover, like macOS overlay scrollbars.

## Shared controls
`controls.css` defines page actions across notes, lists, calendars, notebooks, trash and forms: New York 13px/1.35, 16px stroke icons and 6px spacing. `shell.css` holds the sidebar, binding, toolbar, overflow menu, index and note header. Use `actionLabel(icon, label)` for labeled controls and `.toolbar-primary` for the one primary action of a view. Keyboard focus remains visible and the short icon wobble respects reduced motion without moving the hit area. Compact windows reduce surrounding spacing rather than shrinking controls.

## Interaction
Slash starts command search in place. The plus button focuses explicit search. Arrows navigate, Enter selects, Escape closes menus. Every page action in "Mais" is also in the native **Nota** menu with a shortcut, enabled only where the page offers it. Preserve editing selection during formatting and insertion. Respect reduced-motion settings.
