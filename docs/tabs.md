# Tabs — implementation

This document describes what is built in the tabs slice. It covers the `tab` and `tab_card` data shapes, Dexie-backed storage, a React hook owning per-tab card and folder state, a dumb `Tab` component, and supporting UI (`Dock`, `TransientCard`, `FolderPanel`).

For the long-term vault design see [design.md](./design.md). For the card primitive this slice builds on, see [cards.md](./cards.md). For the vault panel and folder components see [vault.md](./vault.md).

## Milestone

A single default tab with ordered, editable, removable cards. All state (order, fold, hidden, card content, shelf/library location, folders) survives a browser refresh via Dexie IndexedDB.

Flow:

1. On first load, `useTabs` finds no stored tabs and auto-creates a "Main" tab, persisting it immediately.
2. User clicks **+** in the Dock. A `TransientCard` appears at the bottom of the feed for typing title and body.
3. On submit, `useTabs.addCard()` creates the card and a `tab_card` join entry and persists both.
4. Cards are displayed in position order. Folded cards show title only; hidden cards render at reduced opacity but remain in the DOM.
5. Clicking a card's title or body enters inline edit mode. Changes are committed on blur and persisted via `useTabs.updateCard()`.
6. The folder icon in the Dock toggles the `FolderPanel`, which shows Shelf, Library, and Brain tabs above the dock.
7. On reload, `useTabs` rehydrates all data from Dexie — order, fold, hidden, content, location, and folders are all restored.

## File map

```
src/
  layout/
    FolderPanel.jsx        # Slide-up vault panel anchored above the dock
    FolderPanel.css
    FolderPanel.test.jsx   # [TEST]
  vault/
    ShelfRow.jsx           # Compact row for shelf entries in FolderPanel
    ShelfRow.css
    ShelfRow.test.jsx      # [TEST]
    ShelfRow.stories.jsx   # [STORY]
    FolderTree.jsx         # Recursive folder tree for Library view in FolderPanel
    FolderTree.css
    FolderTree.test.jsx    # [TEST]
    FolderTree.stories.jsx # [STORY]
  tab/
    createTab.js           # Tab + tab_card factories; pure helpers
    createTab.test.js      # [TEST] Unit tests for all pure functions
    tabStorage.js          # Per-record tab and tab_card operations (no React)
    tabStorage.test.js     # [TEST] Round-trip and upsert tests
    useTabs.js             # React hook: async Dexie init, owns all tab and folder state
    useTabs.test.js        # [TEST] State-transition tests
    Tab.jsx                # Dumb component: entries → ordered, interactive cards
    Tab.css
    Tab.test.jsx           # [TEST]
    Tab.stories.jsx        # [STORY]
    Dock.jsx               # Bottom bar: scroll-top, add-card, folders, tab-overview, menu
    Dock.css
    Dock.test.jsx          # [TEST]
    Dock.stories.jsx       # [STORY]
    TransientCard.jsx      # Inline card creation form (appears at bottom of feed)
    TransientCard.css
    TransientCard.test.jsx # [TEST]
    TransientCard.stories.jsx # [STORY]
    index.js               # Barrel exports for the tab module
  App.jsx                  # Composes useTabs + Tab + FolderPanel + Dock
  App.css
```

## Data models

### Tab

`createTab({ name = 'New tab', order = 0 })` returns:

| Field       | Type   | Notes                             |
|-------------|--------|-----------------------------------|
| `id`        | string | `crypto.randomUUID()`             |
| `name`      | string | Display name                      |
| `kind`      | string | Always `'blank'` for now          |
| `order`     | number | Position among tabs (0 = first)   |
| `createdAt` | number | `Date.now()` at creation          |
| `updatedAt` | number | Same as `createdAt` for now       |

### TabCard (join)

`createTabCard({ tabId, cardId, position })` returns:

| Field         | Type    | Notes                                    |
|---------------|---------|------------------------------------------|
| `tabId`       | string  | References the parent tab                |
| `cardId`      | string  | References a card in cardStorage         |
| `position`    | number  | 0-indexed sort order within the tab      |
| `foldState`   | boolean | `true` = body collapsed; default `false` |
| `hiddenState` | boolean | `true` = rendered at reduced opacity; default `false` |

## Pure helpers

All in `createTab.js`. Immutable — none mutate their inputs.

| Function | Description |
|---|---|
| `nextPosition(tabCards)` | Returns `tabCards.length` — append position |
| `reorderTabCard(tabCards, cardId, toPosition)` | Returns new array with card moved and all positions renumbered |
| `setTabCardFold(tabCards, cardId, foldState)` | Returns new array with matching card's `foldState` updated |
| `setTabCardHidden(tabCards, cardId, hiddenState)` | Returns new array with matching card's `hiddenState` updated |
| `removeTabCard(tabCards, cardId)` | Returns new array with the matching entry removed and positions renumbered |

## Storage

Backed by IndexedDB via Dexie. See [storage.md](./storage.md) for the database schema and test setup.

| Function | Behaviour |
|---|---|
| `getAllTabs()` | Returns all tab records from Dexie. |
| `putTab(tab)` | Upserts a tab record. |
| `getAllTabCards()` | Returns all tab_card records from Dexie. |
| `putTabCard(tabCard)` | Upserts a tab_card record (compound key `[tabId, cardId]`). |
| `deleteTabCard(tabId, cardId)` | Deletes a tab_card by compound key. |

## React hook

`useTabs()` returns:

| Property         | Type        | Description |
|------------------|-------------|-------------|
| `tab`            | `Tab\|null` | The active tab; `null` before init completes |
| `isReady`        | `boolean`   | `true` once async init has loaded all data from Dexie |
| `entries`        | `Entry[]`   | Cards in position order. Each entry: `{ card, position, foldState, hiddenState }` |
| `folders`        | `Folder[]`  | All folders, loaded from Dexie on init and updated by `createFolder` |
| `shelfEntries`   | `Card[]`    | Derived: all cards with `location === 'shelf'`, sorted by `createdAt` ascending |
| `libraryEntries` | `Card[]`    | Derived: all cards with `location === 'library'`, sorted by `updatedAt` descending |
| `addCard`        | `function`  | `({ title, body }) → card` — creates card + tab_card, persists both |
| `updateCard`     | `function`  | `(cardId, { title, body })` — updates card fields, persists |
| `removeCard`     | `function`  | `(cardId)` — removes tab_card and card from state and Dexie |
| `reorder`        | `function`  | `(cardId, toPosition)` — reorders entries and renumbers positions |
| `fold`           | `function`  | `(cardId)` — sets foldState to `true` |
| `unfold`         | `function`  | `(cardId)` — sets foldState to `false` |
| `hide`           | `function`  | `(cardId)` — sets hiddenState to `true` |
| `unhide`         | `function`  | `(cardId)` — sets hiddenState to `false` |
| `saveToShelf`    | `function`  | `(cardId)` — sets card `location` to `'shelf'`, persists |
| `moveToLibrary`  | `function`  | `(cardId, folderId?)` — sets card `location` to `'library'` and `folderId`, persists |
| `createFolder`   | `function`  | `({ name?, parentId? }) → folder` — creates a folder, persists it |

`shelfEntries` and `libraryEntries` are derived from `cardsById` — no extra storage calls. They update reactively whenever a card's `location` changes.

On first mount with no stored tabs, `useTabs` auto-creates and persists a "Main" tab. Initialisation is async: a single `useEffect` on mount awaits `getAllTabs()`, `getAllTabCards()`, `getAllCards()`, and `getAllFolders()` in parallel, then sets state. `isReady` is `false` until init completes.

## App layout

`App.jsx` owns:
- `useTabs()` — all card, tab, and folder state
- `folderPanelOpen` state — whether `FolderPanel` is visible
- `transientOpen` state — whether the inline `TransientCard` form is open

Structure:

```jsx
<div className="app-shell">
  <div className="app-shell__content">          {/* scrollable card area */}
    <Tab ... />
    {transientOpen && <TransientCard ... />}
  </div>
  <div className="app-shell__dock-area">         {/* position: relative */}
    {folderPanelOpen && <FolderPanel ... />}      {/* position: absolute, bottom: calc(100% - 2px) */}
    <Dock onFolder={() => setFolderPanelOpen(v => !v)} ... />
  </div>
</div>
```

`.app-shell__dock-area` is a `position: relative` wrapper that serves as the positioning context for `FolderPanel`. The panel uses `position: absolute; bottom: calc(100% - 2px)` to sit flush above the dock (the 2px overlap merges the panel's bottom border with the dock's top border into a single espresso line). The dock's own position, size, and styling are completely unchanged whether the panel is open or closed.

## Display component — Tab

`Tab({ entries, folders, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary })` is presentational.

- Renders all entries in the order received (caller is responsible for sorting by `position`).
- Passes fold/hidden state, toggle callbacks, reorder callbacks, update callback, and close callback into each `Card`.
- Toggle callbacks are computed inline (if folded → calls `onUnfold`; otherwise `onFold`; same for hide/unhide).
- Reorder: first card has no up button; last card has no down button; single card has neither.
- Location buttons (`onSaveToShelf`, `onMoveToLibrary`) are forwarded to each `Card` with the card id bound.
- Empty state: renders `"No cards yet."` message.

## Dock

`Dock({ onAdd, addDisabled, onScrollTop, onFolder, onTabOverview, onMenu })` is a fixed bottom bar containing two button groups.

**Left group:** scroll-to-top caret (`^`), add card (`+`), folders toggle.
**Right group:** tab overview, menu.

- `onAdd` is called when `+` is clicked. `addDisabled` disables it while a `TransientCard` is open.
- `onFolder` toggles the `FolderPanel` from the parent (App.jsx).
- `onScrollTop`, `onTabOverview`, and `onMenu` are wired in App.jsx (currently no-ops for tab overview and menu).
- All buttons use the same ghost style — no primary variant.
- Renders as `role="toolbar" aria-label="Tab actions"`.

## TransientCard

`TransientCard({ onSubmit, onDismiss })` is an inline card-creation form that appears at the bottom of the feed.

- Shows a type picker row: **Text** is enabled; Process, Portal, Container are present but disabled.
- Title and body inputs with labels.
- **Add →** button calls `onSubmit({ title, body })`.
- **Cancel** button calls `onDismiss()`.

## FolderPanel

`FolderPanel` is a slide-up panel anchored above the Dock. See [vault.md](./vault.md) for full details.

- Three tabs along the bottom of the panel: **Shelf**, **Library**, **Brain**.
- Shelf tab shows `ShelfRow` entries with a "Move to Library" action.
- Library tab shows `FolderTree` with folder creation support.
- Brain tab shows a "coming soon" placeholder.
- An X button closes the panel (calls `onClose` → sets `folderPanelOpen` to `false` in App.jsx).

## Tests

| File | What it covers |
|------|----------------|
| `createTab.test.js` | `createTab` defaults + custom, unique ids; `createTabCard` defaults; `nextPosition`; `reorderTabCard` (later, earlier, same, not-found, clamp); `setTabCardFold`; `setTabCardHidden`; `removeTabCard` (removes entry, renumbers positions) |
| `tabStorage.test.js` | Empty reads, `putTab` round-trip, upsert; `putTabCard` round-trip, foldState/hiddenState round-trip, position upsert, `deleteTabCard` by compound key |
| `useTabs.test.js` | Default tab on first mount, existing state loaded on mount, `addCard`, `updateCard`, `removeCard`, `reorder`, `fold`/`unfold`, `hide`/`unhide`, `saveToShelf`/`moveToLibrary` (state + Dexie persistence), `shelfEntries`/`libraryEntries` derivation and sort order, `createFolder` state + persistence, `moveToLibrary` with folderId, remount restores all state |
| `Tab.test.jsx` | Empty state, renders title+body, folded hides body, hidden card renders with `.card--hidden`, position order, Collapse/Expand/Dim/Show/Move/Remove buttons, callbacks called with correct cardId, `onUpdate` passed through, `onSaveToShelf`/`onMoveToLibrary` forwarded |
| `FolderPanel.test.jsx` | Shelf/Library/Brain tabs render; close button; onClose called; shelf empty state; shelf entries; library tree renders; brain placeholder; onMoveToLibrary callback |
| `ShelfRow.test.jsx` | Renders title, type, date; Move to Library button present/absent; callback called |
| `FolderTree.test.jsx` | Tree root renders; folder names; nested folders; cards in folders; root-level cards; expanded by default; collapse/expand toggle; New folder button; subfolder creation callback |
| `Dock.test.jsx` | Renders all 5 buttons with correct aria-labels; `onAdd`, `onScrollTop`, `onFolder`, `onTabOverview`, `onMenu` callbacks called; `addDisabled` disables + button |
| `TransientCard.test.jsx` | Form fields, submit calls onSubmit with values, cancel calls onDismiss, disabled type stubs |
| `App.test.jsx` | + button opens TransientCard, disables dock while open, submit creates card and closes form, cancel closes without creating; clicking Folders opens FolderPanel; FolderPanel shows Shelf/Library/Brain tabs; closing FolderPanel via X removes it |

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Multiple tabs, tab switching UI, tab creation/deletion
- Smart tabs (`kind: 'smart'`)
- Drag-and-drop reorder (position is set via up/down buttons)
- A "reveal hidden cards" panel or bulk-reveal filter
- Search, tagging, or filters over Shelf/Library
- Portal, process, container card types
- Dock Prompt mode (LLM call over tab context)
- Supabase sync
- `user_id` / multi-user
- Rich text, embeds
- Brain feed (currently a "coming soon" placeholder)
- Wiki indexing
