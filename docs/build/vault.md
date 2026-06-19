# Vault — implementation

Vault UI: the `FolderPanel` slide-up panel and its content components (`ShelfRow`, `FolderTree`), plus folder primitives (`createFolder`, `folderStorage`).

## File map

```
src/
  folder/
    createFolder.js         # Folder factory (pure, no React)
    createFolder.test.js    # [TEST]
    folderStorage.js        # Dexie-backed per-record operations (pure, no React)
    folderStorage.test.js   # [TEST]
  layout/
    FolderPanel.jsx         # Slide-up panel: Shelf / Library / Brain tabs
    FolderPanel.css
    FolderPanel.test.jsx    # [TEST]
  vault/
    ShelfRow.jsx            # Compact card row for the Shelf pane
    ShelfRow.css
    ShelfRow.test.jsx       # [TEST]
    ShelfRow.stories.jsx    # [STORY]
    FolderTree.jsx          # Recursive folder tree for the Library pane
    FolderTree.css
    FolderTree.test.jsx     # [TEST]
    FolderTree.stories.jsx  # [STORY]
```

## Folder data model

`createFolder({ name = 'New folder', parentId = null })` returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `name` | string | Display name |
| `parentId` | string \| null | Parent folder id; `null` for root-level |
| `createdAt` | number | `Date.now()` |
| `updatedAt` | number | Same as `createdAt` at creation |

## Folder storage

`src/folder/folderStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllFolders()` | Returns all folder records from Dexie |
| `putFolder(folder)` | Upserts a folder record |
| `deleteFolder(folderId)` | Deletes the record by primary key |

Folders are not flagged `dirty` — they are not synced to Supabase.

## FolderPanel component

Slide-up panel anchored above the Dock via `position: absolute; bottom: calc(100% - 2px)`. The 2px overlap merges the panel's bottom border with the dock's top border into a single espresso line.

Props: `shelfEntries`, `libraryEntries`, `folders`, `onMoveToLibrary`, `onCreateFolder`, `onClose`.

Owns `activeTab` state (which of the three panes is selected).

**Three panes:**

| Tab | Content |
|---|---|
| Shelf | List of `ShelfRow` components for cards with `location === 'shelf'` |
| Library | `FolderTree` showing all folders and library cards |
| Brain | "coming soon" placeholder |

X button calls `onClose`, removing the panel from the DOM (state in `AppShell`).

The panel is `role="dialog" aria-label="Vault and Brain"`.

## ShelfRow component

`ShelfRow({ card, onMoveToLibrary })` — compact list row.

Shows: card title, card type, creation date (`month day, year` format). When `onMoveToLibrary` is provided, renders a `→` button (aria: "Move to Library").

Clicking → opens the `FolderPickerOverlay` (via `LocationButton` inside `FolderPanel`). Note: `ShelfRow` itself only has `onMoveToLibrary` — the actual folder picker overlay is handled by `LocationButton` in the card's header, not by `ShelfRow`.

## FolderTree component

`FolderTree({ folders, libraryEntries, onMoveToLibrary, onCreateFolder })` — recursive folder tree.

- Renders root-level folders and root-level cards (those with `folderId === null`).
- Each folder is collapsible (expanded by default).
- "New folder" button creates a root-level folder via `onCreateFolder`.
- Each folder row has a "New subfolder" button for nested creation.
- Cards shown inside their folder.

## Tests

| File | What it covers |
|---|---|
| `createFolder.test.js` | Default fields, custom name/parentId, unique ids |
| `folderStorage.test.js` | Empty read, putFolder round-trip, upsert, deleteFolder, parentId round-trip |
| `FolderPanel.test.jsx` | Shelf/Library/Brain tabs render; close button; onClose called; shelf empty state; shelf entries; library tree renders; brain placeholder; onMoveToLibrary callback |
| `ShelfRow.test.jsx` | Renders title, type, date; Move to Library button present/absent; callback called |
| `FolderTree.test.jsx` | Tree root; folder names; nested folders; cards in folders; root-level cards; expanded by default; collapse/expand toggle; New folder button; subfolder creation callback |

## Not built yet

- Folder rename or deletion from the UI
- Folder sync to Supabase
- Search or filter within Shelf/Library
- Brain feed content (currently "coming soon")
- Card removal from Shelf/Library back to tab
- Multi-level folder nesting UI polish
