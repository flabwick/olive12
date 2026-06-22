# Vault — implementation

Vault UI: the `FolderPanel` slide-up panel and its content components (`ShelfRow`, `VaultTabRow`, `FolderTree`), plus folder primitives (`createFolder`, `folderStorage`).

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
    VaultTabRow.jsx         # Compact tab row for saved tabs in Shelf/Library panes
    VaultTabRow.css
    VaultTabRow.test.jsx    # [TEST]
    VaultTabRow.stories.jsx # [STORY]
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

Props:

| Prop | Type | Description |
|---|---|---|
| `shelfEntries` | `Card[]` | Cards with `location === 'shelf'` |
| `libraryEntries` | `Card[]` | Cards with `location === 'library'` |
| `shelfTabs` | `Tab[]` | Tabs with `savedLocation === 'shelf'` |
| `libraryTabs` | `Tab[]` | Tabs with `savedLocation === 'library'` |
| `folders` | `Folder[]` | All folders |
| `onMoveToLibrary` | function \| undefined | `(cardId, folderId)` — promote card to Library |
| `onMoveTabToLibrary` | function \| undefined | `(tabId)` — promote tab to Library |
| `onCreateFolder` | function \| undefined | `({ parentId })` — create folder |
| `onClose` | function | Close the panel |
| `onOpenAsPortal` | function \| undefined | `(cardId)` — open shelf/library card as portal in active tab |
| `onOpenTab` | function \| undefined | `(tabId)` — switch to a saved tab and close panel |
| `brainFeedItems` | `BrainFeedItem[]` | Stale/orphan library cards for Brain tab |
| `onReindex` | function \| undefined | `(cardId)` — manually re-index a library card (passed to `BrainFeedList`) |
| `initialTab` | string | Which pane to open on first render: `'shelf'` (default), `'library'`, or `'brain'` |
| `highlightedCardId` | string \| undefined | If set, the matching card row in Shelf or Library is visually highlighted |

Owns `activeTab` state (which of the three panes is selected), seeded from `initialTab`.

**Three panes:**

| Tab | Content |
|---|---|
| Shelf | `VaultTabRow` list (saved tabs) followed by `ShelfRow` list (saved cards). Empty state shown only when both lists are empty. |
| Library | `VaultTabRow` list (library tabs) above `FolderTree`. Tab list only rendered when `libraryTabs.length > 0`. |
| Brain | `BrainFeedList` — list of stale/orphan library cards with Re-index button. Empty: "No issues found." See [brain.md](./brain.md). |

X button calls `onClose`, removing the panel from the DOM (state in `AppShell`).

The panel is `role="dialog" aria-label="Vault and Brain"`.

## ShelfRow component

`ShelfRow({ card, onMoveToLibrary, onOpenAsPortal, highlighted })` — compact list row for a saved card.

Shows: card title, card type badge, creation date (`month day, year` format).

- `onOpenAsPortal` provided → renders `↗` button (aria: "Open in tab"); calls `onOpenAsPortal(card.id)`.
- `onMoveToLibrary` provided → renders `→` button (aria: "Move to Library"); calls `onMoveToLibrary()`.
- `highlighted` true → adds `.shelf-row--highlighted` class (amber background tint).

## VaultTabRow component

`VaultTabRow({ tab, onOpen, onMoveToLibrary })` — compact list row for a saved tab.

Shows: tab name, `"tab"` type badge, creation date.

- `onOpen` provided → renders `↗` button (aria: "Switch to tab"); calls `onOpen(tab.id)`.
- `onMoveToLibrary` provided → renders `→` button (aria: "Move to Library"); calls `onMoveToLibrary()`.

Appears in the Shelf pane (tabs with `savedLocation: 'shelf'`) and at the top of the Library pane (tabs with `savedLocation: 'library'`). Visually consistent with `ShelfRow`.

## FolderTree component

`FolderTree({ folders, cards, onCreateFolder, onOpenAsPortal, highlightedCardId })` — recursive folder tree.

- Renders root-level folders and root-level cards (those with `folderId === null`).
- Each folder is collapsible (expanded by default).
- "New folder" button creates a root-level folder via `onCreateFolder`.
- Each folder row has a "New subfolder" button for nested creation.
- Cards shown inside their folder; each card row gets `onOpenAsPortal` button if provided.
- `highlightedCardId` — when set, adds `.folder-tree__file-row--highlighted` (amber background tint) to the matching card row, including inside nested folders.

## Tests

| File | What it covers |
|---|---|
| `createFolder.test.js` | Default fields, custom name/parentId, unique ids |
| `folderStorage.test.js` | Empty read, putFolder round-trip, upsert, deleteFolder, parentId round-trip |
| `FolderPanel.test.jsx` | Shelf/Library/Brain tabs render; close button; onClose called; shelf empty state (only when both cards and tabs empty); shelf entries; library tree renders; Brain feed items + Re-index button; onMoveToLibrary callback; onOpenAsPortal on shelf card; onOpenAsPortal on library card; initialTab opens correct pane; highlightedCardId adds highlight class to matching shelf row; shelfTabs renders VaultTabRow; onOpenTab called with tab id; onMoveTabToLibrary called with tab id; libraryTabs renders in Library pane; onOpenTab from Library pane |
| `ShelfRow.test.jsx` | Renders title, type, date; Move to Library button present/absent; Open in tab button present/absent; callbacks; highlighted class applied/absent |
| `VaultTabRow.test.jsx` | Renders tab name, "tab" badge, date; Switch to tab button present/absent; Move to Library button present/absent; onOpen called with tab id; onMoveToLibrary called |
| `FolderTree.test.jsx` | Tree root; folder names; nested folders; cards in folders; root-level cards; expanded by default; collapse/expand toggle; New folder button; subfolder creation callback; Open in tab button; highlightedCardId highlights matching card row |

## Not built yet

- Folder rename or deletion from the UI
- Folder sync to Supabase
- Search or filter within Shelf/Library
- Brain accept/dismiss persistence (currently stateless)
- Card removal from Shelf/Library back to tab
- Multi-level folder nesting UI polish
- Highlight for tabs in the vault (currently only cards can be highlighted)
