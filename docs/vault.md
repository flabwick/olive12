# Vault — implementation

This document describes the vault UI: the `FolderPanel` slide-up panel and its two content components (`ShelfRow`, `FolderTree`), plus the folder primitives (`createFolder`, `folderStorage`) that back them.

For the long-term vault design see [design.md](./design.md). For cards and tabs this builds on, see [cards.md](./cards.md) and [tabs.md](./tabs.md). For Dexie storage details see [storage.md](./storage.md).

## Milestone

Turn the `location` field (a latent flag on every card) into navigable vault views. A panel toggled from the Dock's folder button slides up above the dock and exposes three panes — Shelf (saved cards), Library (promoted cards in a folder tree), and Brain (placeholder). Folders can be created and cards assigned to them when promoted to the Library.

## File map

```
src/
  layout/
    FolderPanel.jsx        # Slide-up vault panel; owns active-tab state
    FolderPanel.css
    FolderPanel.test.jsx   # [TEST]
  vault/
    ShelfRow.jsx           # Compact card row for the Shelf pane
    ShelfRow.css
    ShelfRow.test.jsx      # [TEST]
    ShelfRow.stories.jsx   # [STORY]
    FolderTree.jsx         # Recursive folder tree for the Library pane
    FolderTree.css
    FolderTree.test.jsx    # [TEST]
    FolderTree.stories.jsx # [STORY]
  folder/
    createFolder.js        # Folder factory + tree utilities (pure JS)
    createFolder.test.js   # [TEST]
    folderStorage.js       # Dexie-backed folder operations (no React)
    folderStorage.test.js  # [TEST]
```

## Folder data model

`createFolder({ name = 'New folder', parentId = null })` returns:

| Field       | Type           | Notes                                        |
|-------------|----------------|----------------------------------------------|
| `id`        | string         | `crypto.randomUUID()`                        |
| `name`      | string         | Display name                                 |
| `parentId`  | string \| null | Parent folder id; `null` for root-level      |
| `createdAt` | number         | `Date.now()` at creation                     |
| `updatedAt` | number         | Same as `createdAt` for now                  |

### Pure tree utilities

All in `createFolder.js`. Immutable — none mutate their inputs.

| Function | Signature | Description |
|---|---|---|
| `buildFolderTree(folders, parentId?)` | `(Folder[], string\|null) → FolderNode[]` | Builds a recursive tree from a flat folder array. Each node is `{ ...folder, children: FolderNode[] }`. Sorted alphabetically at each level. |
| `flattenFolderTree(folders, parentId?, depth?)` | `(Folder[], string\|null, number) → { folder, depth }[]` | Flattens a folder tree into a depth-annotated list, children immediately after their parent. Useful for picker UIs. |

### Folder storage

`folderStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllFolders()` | Returns all folder records from Dexie. |
| `putFolder(folder)` | Upserts a folder record. |
| `deleteFolder(folderId)` | Deletes a folder record by primary key. |

## FolderPanel

`FolderPanel` is an absolutely-positioned slide-up panel that sits flush above the Dock. It is rendered inside `.app-shell__dock-area` (a `position: relative` wrapper), anchored with `position: absolute; bottom: calc(100% - 2px)`. The 2px overlap merges the panel's bottom border with the dock's top border into a single espresso line — the dock's own CSS is unchanged.

### Props

| Prop | Type | Description |
|---|---|---|
| `shelfEntries` | `Card[]` | Cards with `location === 'shelf'`, sorted by `createdAt` ascending — computed by `useTabs` |
| `libraryEntries` | `Card[]` | Cards with `location === 'library'`, sorted by `updatedAt` descending — computed by `useTabs` |
| `folders` | `Folder[]` | All folders from `useTabs` |
| `onMoveToLibrary` | `function` | `(cardId, folderId) => void` — forwarded from `useTabs.moveToLibrary` |
| `onCreateFolder` | `function` | `({ name?, parentId? }) => void` — forwarded from `useTabs.createFolder` |
| `onClose` | `function` | `() => void` — called when X button is clicked; parent sets `folderPanelOpen` to `false` |

### Layout

The panel is a flex column:
- **Body** (`folder-panel__body`): scrollable content area at the top, `max-height: 50vh`.
- **Nav bar** (`folder-panel__nav-bar`): pinned to the bottom of the panel — tab buttons on the left, X close button on the right.

The active tab is local state inside `FolderPanel` (`useState('shelf')`).

### Pane behaviour

**Shelf pane** (`tab === 'shelf'`):
- Empty state: `"Shelf is empty. Save some cards from your tab."`
- Non-empty: renders a `role="list"` of `ShelfRow` components. Each row receives `onMoveToLibrary` bound to that card's id and `null` as the folderId.

**Library pane** (`tab === 'library'`):
- Renders `FolderTree` with `folders`, `cards={libraryEntries}`, and `onCreateFolder`.

**Brain pane** (`tab === 'brain'`):
- Renders a placeholder with an SVG brain icon and the text "Neural summaries, connections & more — coming soon."

### Animation

The panel animates in with `folder-panel-up`: `opacity: 0 → 1` and `translateY(0.5rem) → 0` over 200ms with a spring easing (`cubic-bezier(0.22, 1, 0.36, 1)`).

## ShelfRow

`ShelfRow({ card, onMoveToLibrary })` is a compact dumb row for a single shelf entry.

| Prop | Type | Description |
|---|---|---|
| `card` | `Card` | The card to display |
| `onMoveToLibrary` | `function \| undefined` | When provided, renders a "Move to Library" (→) button |

Renders: card title, card type badge, formatted `createdAt` date. The "Move to Library" button is omitted when `onMoveToLibrary` is not provided.

## FolderTree

`FolderTree({ folders, cards, onCreateFolder })` is a recursive dumb tree for the Library pane.

| Prop | Type | Description |
|---|---|---|
| `folders` | `Folder[]` | All folders; defaults to `[]` |
| `cards` | `Card[]` | Library cards; defaults to `[]` |
| `onCreateFolder` | `function \| undefined` | When provided, shows "New folder" toolbar button and per-folder "+" buttons |

### Structure

- Root-level cards (`folderId === null`) appear at the top of the list as file rows, above folders.
- Folders are rendered recursively via `FolderNode` components, built from `buildFolderTree(folders)`.
- Each `FolderNode` starts expanded. Clicking its toggle button collapses/expands its children.
- Cards with `folderId` matching a folder appear as file rows inside that folder's children list.
- When `onCreateFolder` is provided: a "New folder" button appears in a toolbar above the tree; each folder row also has a "+" button that calls `onCreateFolder({ parentId: folder.id })`.

## Tests

| File | What it covers |
|---|---|
| `createFolder.test.js` | `createFolder` defaults + custom name + parentId + unique ids; `buildFolderTree` empty, root sorted alphabetically, nested children, empty children array; `flattenFolderTree` empty, flat list with depth, children after parent |
| `folderStorage.test.js` | Empty read, `putFolder` round-trip, upsert (no duplicate), `deleteFolder`, `parentId` round-trip |
| `FolderPanel.test.jsx` | Shelf/Library/Brain tabs render; close button renders; onClose called; shelf empty state; shelf entries shown; Library tab shows folder tree; Brain tab shows placeholder; onMoveToLibrary called with card id and null folderId |
| `ShelfRow.test.jsx` | Renders title, type, formatted date; Move to Library button present/absent based on prop; callback called on click |
| `FolderTree.test.jsx` | Tree root renders; folder names render; nested folder renders; cards in folder render; root-level cards render; folders expanded by default; collapse toggle removes children; expand toggle restores children; New folder button present/absent; New folder calls onCreateFolder with parentId null; subfolder button calls onCreateFolder with parentId; empty tree renders cleanly |

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Moving cards between folders after initial placement (drag-and-drop or a folder picker)
- Deleting folders
- Renaming folders
- `FolderPickerOverlay` wired into `FolderPanel` — the overlay component exists on `Card` but the library panel currently only moves to `folderId: null` via the shelf row's "Move to Library" button
- Search, tagging, or filters within Shelf or Library
- Brain feed (currently a "coming soon" placeholder)
- Wiki indexing (`index_entries`, staleness, contradictions)
- LLM integration in the Brain pane
- Supabase sync for folders
- Multiple tabs (FolderPanel shows a single shared vault)
