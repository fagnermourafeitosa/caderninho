# Design system

## Scene
A person writes and plans on a desktop during the day, using a friendly paper notebook with clear contextual tools.

## Tokens
Use existing CSS tokens: paper #fbf0d5, paper shade #efe0b9, ink #303025, muted ink #8a8068, edge #36352a, toolbar #f7e8c5 and active yellow #f8d985. Pastel notebook colors remain selectable.

## Typography
Georgia for writing and command options. Chalkboard SE for small interface labels and handwritten accents. Keep text legible; use grouping and icons to establish hierarchy.

## Components
Cream paper surfaces with ink borders, modest corner rounding and restrained shadows. Vertical notebook tabs and illustrated sidebar icons. Contextual command palette is 300px wide with 40px options, search, category headings, yellow selection, drawn ink icons and a small keyboard hint. Search results scroll only when necessary, without a persistent scrollbar.

## Shared controls
`controls.css` defines page actions across notes, lists, calendars, notebooks, trash and forms: Georgia 12px/1.35, 21px stationery SVG icons and 6px spacing. Use `actionLabel(icon, label)` for labeled renderer controls and `.toolbar-action` for creation actions. Keep titles and writing at their own hierarchy. Hover uses pastel yellow, destructive actions use pastel red, keyboard focus remains visible, and the short icon wobble respects reduced motion without moving the button hit area. Compact windows reduce surrounding spacing rather than shrinking controls.

## Interaction
Slash starts command search in place. The plus button focuses explicit search. Arrows navigate, Enter selects, Escape closes. Preserve editing selection during formatting and insertion. Respect reduced-motion settings.
