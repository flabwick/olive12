# Vault — implementation

Vault UI: the `FolderPanel` slide-up panel and its content components (`ShelfView`, `LibraryView`, `VaultItemRow`, `FolderNode`, etc.), plus folder primitives (`createFolder`, `folderStorage`).

## File map

```
src/
  folder/
    createFolder.js           # Folder factory + buildFolderTree + collectDescendantIds (pure)
    createFolder.test.js      # [TEST]
    folderStorage.js          # Dexie CRUD + getDirtyFolders + markFolderClean (pure, no React)
    folderStorage.test.js     # [TEST]
  layout/
    FolderPanel.jsx           # Slide-up panel: Shelf / Library / Brain tabs
    FolderPanel.css
    FolderPanel.test.jsx      # [TEST]
  vault/
    ShelfView.jsx             # Shelf pane: cards + tabs list with selection support
    ShelfView.css
    ShelfView.test.jsx        # [TEST]
    ShelfView.stories.jsx     # [STORY]
    LibraryView.jsx           # Library pane: folder tree + items with selection support
    LibraryView.css
    LibraryView.test.jsx      # [TEST]
    LibraryView.stories.jsx   # [STORY]
    VaultItemRow.jsx          # Compact row for any vault item (card/tab/file); supports inline rename, selection
    VaultItemRow.css
    VaultItemRow.test.jsx     # [TEST]
    VaultItemRow.stories.jsx  # [STORY]
    FolderNode.jsx            # Recursive folder node: collapsible, inline rename, pick-mode highlighting
    FolderNode.css
    FolderNode.test.jsx       # [TEST]
    InlineRename.jsx          # Inline text input for renaming with conflict detection
    InlineRename.css
    InlineRename.test.jsx     # [TEST]
    SelectionToolbar.jsx      # Toolbar shown in multi-select mode: count, delete (with confirm), move, done
    SelectionToolbar.css
    SelectionToolbar.test.jsx # [TEST]
    DuplicateConflictModal.jsx # Modal: duplicate name on rename — Replace / Keep Both / Cancel
    DuplicateConflictModal.css
    DuplicateConflictModal.test.jsx # [TEST]
    DeleteFolderModal.jsx     # Modal: confirm delete non-empty folder (shows card/folder counts)
    DeleteFolderModal.css
    DeleteFolderModal.test.jsx # [TEST]
    VaultContextMenu.jsx      # (exists; not currently wired to right-click)
    duplicateLogic.js         # Pure: findDuplicateCard, findDuplicateFolder
    duplicateLogic.test.js    # [TEST]
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

`buildFolderTree(folders)` — converts a flat `Folder[]` into a nested tree (`children` array on each node). Used by `LibraryView`.

`collectDescendantIds(folderId, folders)` — returns all descendant folder ids (recursive). Used by `useTabs.deleteFolder`.

## Folder storage

`src/folder/folderStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllFolders()` | Returns all folder records from Dexie |
| `putFolder(folder)` | Upserts a folder record with `dirty: true` |
| `deleteFolder(folderId)` | Deletes the record by primary key |
| `getDirtyFolders()` | Returns all records where `dirty === true` |
| `markFolderClean(folderId, mergedFolder)` | Upserts `mergedFolder` with `dirty: false`; called by sync layer |

Folders are flagged `dirty` on every write. The Supabase sync adapter (`folderSupabaseStorage.js`) and orchestration (`folderSync.js`) exist and are tested but are not yet wired into the scheduler in `useTabs` — see "Not built yet".

## FolderPanel component

Slide-up panel anchored above the Dock via `position: absolute; bottom: calc(100% - 2px)`. The 2px overlap merges the panel's bottom border with the dock's top border into a single line.

`role="dialog" aria-label="Vault and Brain" aria-modal="true"`.

**Props:**

| Prop | Type | Description |
|---|---|---|
| `shelfEntries` | `Card[]` | Cards with `location === 'shelf'` |
| `libraryEntries` | `Card[]` | Cards with `location === 'library'` |
| `shelfTabs` | `Tab[]` | Tabs with `savedLocation === 'shelf'` |
| `libraryTabs` | `Tab[]` | Tabs with `savedLocation === 'library'` |
| `folders` | `Folder[]` | All folders |
| `onMoveToLibrary` | function \| undefined | `(cardId, folderId)` — promote shelf card to library |
| `onMoveTabToLibrary` | function \| undefined | `(tabId)` — promote tab to library |
| `onCreateFolder` | function \| undefined | `({ parentId? })` — create folder |
| `onClose` | function | Close the panel |
| `onOpenAsPortal` | function \| undefined | `(cardId)` — open card as portal in active tab |
| `onOpenTab` | function \| undefined | `(tabId)` — switch to saved tab and close panel |
| `initialTab` | `'shelf' \| 'library' \| 'brain'` | Initial pane when uncontrolled; default `'shelf'` |
| `activeTab` | `'shelf' \| 'library' \| 'brain'` \| undefined | Controlled tab value (from App's `vaultTab` state) |
| `highlightedCardId` | string \| undefined | Highlights the matching card row (amber tint) |
| `activeVaultItemId` | string \| null | Selected item id, or `moveTarget.id` in pick mode |
| `onSelectVaultItem` | function \| undefined | `(item, type)` — user clicks an item |
| `brainFeedItems` | `BrainFeedItem[]` | Passed to `BrainFeedList` |
| `onReindex` | function \| undefined | `(cardId)` — re-index a library card |
| `moveCardToFolder` | function \| undefined | `(cardId, folderId)` — moves card to folder |
| `moveFolder` | function \| undefined | `(folderId, newParentId)` — moves folder |
| `bulkMoveCards` | function \| undefined | `(cardIds, folderId)` — batch card move |
| `bulkDeleteCards` | function \| undefined | `(cardIds)` — batch card delete |
| `bulkMoveTabs` | function \| undefined | `(tabIds, folderId)` — batch tab move |
| `onUploadCard` | function \| undefined | `(file)` — upload file card (passed to LibraryView toolbar) |
| `pickFolderMode` | boolean | When `true`, clicking a folder calls `onFolderPicked` instead of `onSelectVaultItem` |
| `onFolderPicked` | function \| undefined | `(folder)` — toggle move target (folder clicked in pick mode) |
| `renamingItemId` | string \| null | Id of item currently being renamed inline |
| `onInlineRenameCommit` | function \| undefined | `(itemId, itemType, newName, opts?)` — commit rename |
| `onInlineRenameCancel` | function \| undefined | `(itemId, itemType)` — cancel rename |

**Internal state** (owned by FolderPanel):

- `selected` (`Set<string>`) — ids of selected items in multi-select mode.
- `selectMode` (`boolean`) — whether the panel is in multi-select mode.
- `openFolderIds` (`Set<string>`) — which folders are expanded in the tree. Auto-expands ancestors of `renamingItemId`.
- `conflictModal` — pending conflict state for inline rename that found a duplicate; triggers `DuplicateConflictModal`.

**Three panes:**

| Tab | Content |
|---|---|
| Shelf | `ShelfView` — cards then tabs. Empty state when both lists empty. |
| Library | `LibraryView` — folder tree with nested cards and tabs; root-level cards and tabs below the tree. Empty state when no folders, cards, or tabs. |
| Brain | `BrainFeedList` — stale/orphan library cards with Re-index button. |

**Selection mode:** Entering select mode happens inside `FolderPanel` when a checkbox is toggled. `SelectionToolbar` appears when `selectMode` is true, showing count, Move (currently no-op), Delete (with two-step confirm), and Done.

**Pick folder mode:** When `pickFolderMode` is true, clicking a folder calls `onFolderPicked(folder)` (toggle). FolderNode and VaultItemRow `active` states are driven by `activeVaultItemId` (which equals `moveTarget?.id` in App). Used by the Dock's Move flow.

**Rename conflict resolution:** When `InlineRename` reports a conflict, `FolderPanel` intercepts the commit and shows `DuplicateConflictModal`. On Replace: calls `onInlineRenameCommit(itemId, itemType, newName, { replaceId })`. On Keep both: calls `onInlineRenameCommit(itemId, itemType, newName, { keepBoth: true })`. On Cancel: calls `onInlineRenameCancel`.

## ShelfView component

`ShelfView({ cards, tabs, selected, selectMode, highlightedCardId, activeItemId, renamingId, onSelect, onItemClick, onRenameCommit, onRenameCancel })` — Shelf pane content.

- Renders cards as `VaultItemRow type="card"` then tabs as `VaultItemRow type="tab"`.
- Empty state: "Nothing saved to shelf yet." when both arrays empty.
- Shelf-scope conflict check for card rename: `findDuplicateCard(cards, name, null, card.id)`.
- Tabs in shelf are not renameable from this view (no `renamingId` match for tabs).

## LibraryView component

`LibraryView({ cards, tabs, folders, selected, selectMode, openFolderIds, activeItemId, renamingId, onSelect, onItemClick, onFolderClick, onCreateFolder, onUploadCard, onToggleFolder, onRenameCommit, onRenameCancel })` — Library pane content.

- Builds tree via `buildFolderTree(folders)`.
- Renders tree recursively with `FolderNode` + child `VaultItemRow` rows (cards and tabs inside each folder).
- Root-level cards and tabs rendered below the tree.
- Conflict check for folder rename: `findDuplicateFolder(allFolders, name, node.parentId, node.id)`.
- Conflict check for card rename: `findDuplicateCard(cards, name, card.folderId, card.id)`.
- Empty state: "Nothing in library yet." when folders, cards, and tabs are all empty.

## VaultItemRow component

`VaultItemRow({ type, title, depth, highlighted, active, selected, selectMode, editing, checkConflict, onRenameCommit, onRenameCancel, onSelect, onClick })`

**Types:** `'card'` (doc icon), `'tab'` (tab icon), `'file'` (file-attachment icon). Folder rows use `FolderNode` instead.

**Behaviour:**
- In `selectMode` (and not editing): shows checkbox; click calls `onSelect`.
- Otherwise: click calls `onClick`.
- When `editing`: renders `InlineRename` instead of the name span.
- `depth` drives `--depth` CSS custom property for indent.
- Classes: `vault-item-row--highlighted`, `vault-item-row--active`, `vault-item-row--selected`, `vault-item-row--editing`, `vault-item-row--{type}`.

## FolderNode component

`FolderNode({ folder, isOpen, onToggle, onClick, depth, active, editing, checkConflict, onRenameCommit, onRenameCancel, children })`

- Collapsible: caret button calls `onToggle`; `aria-expanded`.
- `active` adds `.vault-folder-node__row--active`.
- `editing` renders `InlineRename`; caret is `tabIndex=-1` while editing.
- `children` rendered when `isOpen` (subfolder nodes and item rows from parent).

## InlineRename component

`InlineRename({ value, checkConflict, onCommit, onCancel })`

- Auto-focuses and selects text on mount.
- `checkConflict(trimmedName) → boolean` — called on every keystroke; adds `.vault-inline-rename--conflict` class when true.
- On commit (Enter or blur without conflict): calls `onCommit(trimmed, hasConflict)`.
- On blur with conflict: calls `onCancel` (does not commit).
- Escape: calls `onCancel`.
- Empty string on commit: calls `onCancel`.

## SelectionToolbar component

`SelectionToolbar({ count, onMove, onDelete, onDone })`

- `role="toolbar" aria-label="Selection actions"`.
- Shows count, Move button (disabled when count 0), Delete button (disabled when count 0), Done button.
- Delete uses two-step confirm: first click shows "Confirm delete" button; second click calls `onDelete` and resets.

## DuplicateConflictModal component

`DuplicateConflictModal({ itemType, conflictName, onReplace, onKeepBoth, onCancel })`

- `role="dialog" aria-modal="true" aria-label="Name conflict"`.
- Shows the conflicting name and three actions: Replace, Keep both, Cancel.
- Backdrop click calls `onCancel`.

## DeleteFolderModal component

`DeleteFolderModal({ name, cardCount, folderCount, onConfirm, onCancel })`

- `role="dialog" aria-modal="true" aria-label="Confirm delete folder"`.
- Shows folder name and detail text: how many total items will be deleted, including nested folders.
- Single Delete all confirm button + Cancel.
- Backdrop click calls `onCancel`.

## duplicateLogic.js

Pure helpers. No React, no storage.

| Function | Behaviour |
|---|---|
| `findDuplicateFolder(folders, name, parentId, excludeId?)` | Returns first folder in same `parentId` scope with matching name (case-insensitive trim); `null` if none. |
| `findDuplicateCard(cards, title, folderId, excludeId?)` | Returns first card in same `folderId` scope with matching title (case-insensitive trim); `null` if none. |

## Tests

| File | What it covers |
|---|---|
| `createFolder.test.js` | Default fields, custom name/parentId, unique ids |
| `folderStorage.test.js` | Empty read, putFolder round-trip, `dirty: true`, upsert, deleteFolder, parentId round-trip, getDirtyFolders, markFolderClean |
| `FolderPanel.test.jsx` | Shelf/Library/Brain tabs render; close button; shelf empty state; shelf entries; tabs in shelf; library tree renders; Brain feed items; onMoveToLibrary; onOpenAsPortal; onOpenTab; initialTab; highlightedCardId; controlled activeTab prop; pick folder mode (folder click calls onFolderPicked); selection mode (checkbox, toolbar, bulk delete); inline rename commit/cancel; DuplicateConflictModal shown on conflict; Replace/Keep Both/Cancel handlers |
| `ShelfView.test.jsx` | Renders cards and tabs; empty state; card active/highlighted/selected; selectMode checkbox; onItemClick; conflict detection for rename |
| `LibraryView.test.jsx` | Tree root; folder names; nested folders; cards in folders; root-level cards; tabs in folders; open/collapsed folders; onFolderClick; onToggleFolder; empty state; conflict detection |
| `VaultItemRow.test.jsx` | Renders type icon; name; active/highlighted/selected classes; selectMode checkbox; editing renders InlineRename; click handlers |
| `FolderNode.test.jsx` | Folder name; caret aria-expanded; expand/collapse; active class; editing renders InlineRename; children rendered when open |
| `InlineRename.test.jsx` | Auto-focus on mount; conflict class on checkConflict; onCommit called on Enter; onCancel on blur with conflict; onCancel on Escape; empty string cancels |
| `SelectionToolbar.test.jsx` | Count text; Move disabled when 0; Delete two-step confirm; Done calls onDone |
| `DuplicateConflictModal.test.jsx` | Conflict name shown; Replace/Keep Both/Cancel callbacks; backdrop click cancels |
| `DeleteFolderModal.test.jsx` | Folder name; detail text with counts; Delete all and Cancel callbacks; backdrop click cancels |
| `duplicateLogic.test.js` | findDuplicateCard: match/no-match/case-insensitive/excludeId/folderId scope; findDuplicateFolder: same-scope match/no-match/excludeId |

## Not built yet

- Folder sync scheduler wiring (`folderSync.js` and `folderSupabaseStorage.js` exist and are tested but not yet called from `useTabs`)
- Search or filter within Shelf/Library
- Brain accept/dismiss persistence (currently stateless)
- Multi-select drag-drop reorder
- VaultContextMenu wired to right-click
- Highlight for tabs in the vault (currently only cards can be highlighted via `highlightedCardId`)
- SelectionToolbar Move action (button present, `onMove` prop wired but the actual move flow from multi-select is not implemented)
