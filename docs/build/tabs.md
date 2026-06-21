# Tabs — implementation

Tab and tab_card data shapes, Dexie-backed storage, the `useTabs` and `useDock` React hooks, and the full UI layer (TabHeader, Tab, TabSwitcher, Dock, DockCardPanel, FolderPanel).

## File map

```
src/
  auth/
    AuthForm.jsx              # Dumb sign-in / sign-up form (email + password)
    AuthForm.css
    AuthForm.test.jsx         # [TEST]
    AuthForm.stories.jsx      # [STORY]
  lib/
    supabaseClient.js         # Supabase singleton (reads from .env)
  prompt/
    assembleContext.js        # Pure: filters tab entries to visible contextCards
    assembleContext.test.js   # [TEST]
    buildPrompt.js            # Pure: builds OpenRouter messages array
    buildPrompt.test.js       # [TEST]
    DockPrompt.jsx            # Dumb: prompt textarea + send + cancel + error
    DockPrompt.css
    DockPrompt.test.jsx       # [TEST]
    DockPrompt.stories.jsx    # [STORY]
  sync/
    cardSyncLogic.js          # Pure: hash, classify, resolve conflict
    cardSyncLogic.test.js     # [TEST]
    cardSupabaseStorage.js    # Supabase adapter factory
    cardSupabaseStorage.test.js # [TEST]
    cardSync.js               # Orchestration: syncDirty, pullRemote, scheduler
    cardSync.test.js          # [TEST]
  layout/
    FolderPanel.jsx           # Slide-up vault panel anchored above the dock
    FolderPanel.css
    FolderPanel.test.jsx      # [TEST]
  vault/
    ShelfRow.jsx              # Compact row for shelf card entries in FolderPanel
    ShelfRow.css
    ShelfRow.test.jsx         # [TEST]
    ShelfRow.stories.jsx      # [STORY]
    VaultTabRow.jsx           # Compact row for saved tab entries in FolderPanel
    VaultTabRow.css
    VaultTabRow.test.jsx      # [TEST]
    VaultTabRow.stories.jsx   # [STORY]
    FolderTree.jsx            # Recursive folder tree for Library view
    FolderTree.css
    FolderTree.test.jsx       # [TEST]
    FolderTree.stories.jsx    # [STORY]
  tab/
    createTab.js              # Tab + tab_card factories; pure helpers for both
    createTab.test.js         # [TEST]
    tabStorage.js             # Per-record tab and tab_card operations (pure, no React)
    tabStorage.test.js        # [TEST]
    tabSupabaseStorage.js     # Supabase adapter for saved tabs (user_tabs)
    tabSupabaseStorage.test.js # [TEST]
    dockCardStorage.js        # Dexie-backed dock_cards CRUD (pure, no React)
    dockCardStorage.test.js   # [TEST]
    dockStateMachine.js       # Pure: computeDockState({ activeDockCardId, activeEditorCardId, activeSurface })
    dockStateMachine.test.js  # [TEST]
    useTabs.js                # React hook: Dexie init, card/tab/folder/index/brain/flip state
    useTabs.test.js           # [TEST]
    useDock.js                # React hook: dock card ids, active card, dock state
    useDock.test.js           # [TEST]
    TabHeader.jsx             # Dumb: inline-editable tab name + save button + tab overview button
    TabHeader.css
    TabHeader.test.jsx        # [TEST]
    TabHeader.stories.jsx     # [STORY]
    TabSwitcher.jsx           # Dumb: full-screen overlay showing all tabs + add tile
    TabSwitcher.css
    TabSwitcher.test.jsx      # [TEST]
    TabSwitcher.stories.jsx   # [STORY]
    Tab.jsx                   # Dumb: entries → ordered, interactive cards (text + portal)
    Tab.css
    Tab.test.jsx              # [TEST]
    Tab.stories.jsx           # [STORY]
    Dock.jsx                  # 3-state toolbar (BASE / DOCK_EDITOR / TAB_EDITOR)
    Dock.css
    Dock.test.jsx             # [TEST]
    Dock.stories.jsx          # [STORY]
    DockCardPanel.jsx         # Dumb: Card editor panel for the active dock card
    DockCardPanel.css
    DockCardPanel.test.jsx    # [TEST]
    DockCardPanel.stories.jsx # [STORY]
    index.js                  # Barrel exports
  brain/
    createIndexEntry.js       # Pure: IndexEntry data shape factory
    createIndexEntry.test.js  # [TEST]
    finishIndexResult.js      # Normalize LLM JSON + body fallback
    finishIndexResult.test.js # [TEST]
    indexCard.js              # wiki-index invoke + persist
    indexCard.test.js         # [TEST]
    indexEntryStorage.js      # Dexie-backed index_entries operations (pure, no React)
    indexEntryStorage.test.js # [TEST]
    brainFeedLogic.js         # detectStaleEntries
    brainFeedLogic.test.js    # [TEST]
    BrainFeed.jsx             # FolderPanel Brain tab list
    BrainFeedItem.jsx
  debug/
    indexPipelineDebug.js     # Event log for index pipeline
    indexPipelineDebug.test.js
    IndexDebugPanel.jsx       # Floating debug panel (toggled from Settings)
    IndexDebugPanel.css
  card/
    flipLogic.js              # Pure flip set helpers
    CardBack.jsx              # Back face (composed by Card / PortalCard)
    RichTextEditorContext.jsx # Context: active editor, cardId, surface
    RichTextEditor.jsx        # Tiptap editor + embed bar
    EmbeddedCardNode.js       # Tiptap node for [[cardId]] tokens
    EmbedEntriesContext.jsx   # Context: vault entries for embed picker
    EmbedSourcePanel.jsx      # Dumb: searchable card picker
  App.jsx                     # App (session gate) + AppShell (composes all UI)
  App.css
supabase/
  functions/
    dock-prompt/
      index.ts                # Deno Edge Function: OpenRouter call → { title, body }
    wiki-index/
      index.ts                # Deno Edge Function: card + neighbors → { title, tags, summary, links }
  migrations/
    20260618000000_create_cards.sql
    20260620000000_create_index_entries.sql
    20260620120000_create_user_tabs.sql
playwright.config.js          # Playwright config; webServer → http://localhost:5173
e2e/
  tabs.spec.js                # [E2E] Full tab management flow (requires TEST_EMAIL / TEST_PASSWORD)
```

## Data models

### Tab

`createTab({ name = 'New tab', order = 0 })` returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `name` | string | Display name |
| `kind` | string | Always `'blank'` |
| `order` | number | Position among tabs (0 = first) |
| `savedLocation` | string | `'none' \| 'shelf' \| 'library'`; default `'none'` |
| `savedFolderId` | string\|null | Folder id when `savedLocation === 'library'`; otherwise `null` |
| `createdAt` | number | `Date.now()` |
| `updatedAt` | number | Same as `createdAt` at creation |

### TabCard (join)

`createTabCard({ tabId, cardId, position })` returns:

| Field | Type | Notes |
|---|---|---|
| `tabId` | string | References the parent tab |
| `cardId` | string | References a card in cardStorage |
| `position` | number | 0-indexed sort order within the tab |
| `foldState` | boolean | `true` = body collapsed; default `false` |
| `hiddenState` | boolean | `true` = rendered at reduced opacity; default `false` |

### DockCard

Records in the `dock_cards` Dexie table (version 7) track which cards are pinned to the dock.

| Field | Type | Notes |
|---|---|---|
| `cardId` | string (PK) | References a card in `cards` |
| `order` | number | Position in the dock pill row |

## Pure helpers (createTab.js)

### Tab-level helpers

| Function | Description |
|---|---|
| `updateTabFields(tab, fields)` | Returns new tab with merged fields and `updatedAt: Date.now()` |
| `setTabName(tabs, tabId, name)` | Returns new array with matching tab's name updated |
| `removeTab(tabs, tabId)` | Returns new array with tab removed; all `order` values renumbered |
| `reorderTabs(tabs, tabId, toIndex)` | Returns new array with tab moved to `toIndex`; all `order` renumbered |
| `saveTabToShelf(tab)` | Returns new tab with `savedLocation: 'shelf'` |
| `moveTabToLibrary(tab, folderId?)` | Returns new tab with `savedLocation: 'library'` and `savedFolderId: folderId` |

### TabCard helpers

| Function | Description |
|---|---|
| `nextPosition(tabCards)` | Returns `tabCards.length` — append position |
| `reorderTabCard(tabCards, cardId, toPosition)` | Returns new array with card moved; all positions renumbered |
| `setTabCardFold(tabCards, cardId, foldState)` | Returns new array with matching card's `foldState` updated |
| `setTabCardHidden(tabCards, cardId, hiddenState)` | Returns new array with matching card's `hiddenState` updated |
| `removeTabCard(tabCards, cardId)` | Returns new array with card removed; positions renumbered |

## Dock state machine (dockStateMachine.js)

Pure function. No React, no storage.

```js
computeDockState({ activeDockCardId, activeEditorCardId, activeSurface })
  → DOCK_STATE.BASE | DOCK_STATE.DOCK_EDITOR | DOCK_STATE.TAB_EDITOR
```

Priority order:

1. `activeEditorCardId` is set **and** `activeSurface === 'dock'` → **DOCK_EDITOR** (editing a dock card)
2. `activeEditorCardId` is set (any other surface) → **TAB_EDITOR** (editing a tab card)
3. `activeDockCardId` is set → **DOCK_EDITOR** (dock card open but not being edited)
4. Otherwise → **BASE**

`activeSurface` distinguishes the case where the same card could be in both the dock and a tab; it is set by `RichTextEditorContext` via the `editorSurface` prop on `Card`.

## React hook — useDock

`useDock({ cardsById, activeEditorCardId, activeSurface })` — manages dock card state and open/close lifecycle.

### State

| State | Type | Description |
|---|---|---|
| `dockCardIds` | `string[]` | Ordered list of pinned card ids from Dexie |
| `activeDockCardId` | `string \| null` | Card currently shown in DockCardPanel |

### Returns

| Property | Type | Description |
|---|---|---|
| `dockCardEntries` | `{ cardId, card }[]` | `dockCardIds` zipped with `cardsById`; entries with no matching card are excluded |
| `activeDockCardId` | `string \| null` | Currently open dock card |
| `dockState` | `DOCK_STATE` | Computed from `computeDockState` |
| `openDockCard(cardId)` | function | Sets the active dock card |
| `closeDockCard()` | function | Clears the active dock card |
| `addToDock(cardId)` | async function | Pins an existing card to the dock |
| `removeFromDock(cardId)` | async function | Unpins a card and closes panel if it was active |
| `createAndPinCard(onCreated?)` | async function | Creates an empty card, pins it, opens it, calls `onCreated(card)` |
| `moveDockCardToTab(cardId, addTabCard)` | async function | Adds card to the active tab (if not already there), unpins from dock |

### `createAndPinCard` and `addToCardsById`

`createAndPinCard` accepts an optional `onCreated(card)` callback so the caller can immediately register the new card in `cardsById` without a round-trip through storage. `AppShell` passes `addToCardsById` (from `useTabs`) as the callback.

## React hook — useTabs

`useTabs({ userId })` — `userId` is optional. When provided, sync is active.

### State

| State | Type | Description |
|---|---|---|
| `tabs` | `Tab[]` | All tabs, loaded from Dexie on mount |
| `activeTabId` | `string\|null` | Id of the currently displayed tab; restored from localStorage on mount |
| `tabCards` | `TabCard[]` | All tab_card join records (all tabs, not just active) |
| `cardsById` | `Record<string, Card>` | All cards keyed by id (text and portal) |
| `folders` | `Folder[]` | All folders |
| `isReady` | `boolean` | `true` once Dexie init is complete |
| `promptLoading` | `boolean` | `true` while the dock-prompt edge function is in flight |
| `promptError` | `string` | Error message from last failed prompt call; `''` when no error |
| `indexEntries` | `IndexEntry[]` | Wiki index records loaded from Dexie |
| `allLinks` | `Link[]` | All link records loaded from Dexie on mount; refreshed after any card mutation |
| `flippedCardIds` | `Set<string>` | Card ids currently showing their back face (session-only; not persisted) |

### Three `useEffect` hooks

1. **Scheduler setup** — runs when `userId` changes. Creates a `makeCardSupabaseStorage` adapter (stored in `storageRef`) and a `createCardSyncScheduler` (stored in `schedulerRef`). Sets both to `null` when `userId` is absent.
2. **Initial reconcile** — runs once when `isReady` and `userId` are both truthy. Calls `runNow()` (pull remote → sync dirty), then detects **orphan cards** (cards in Dexie with no `tab_cards` entry — pulled from Supabase on another device) and auto-creates `tab_card` entries on the first tab. Dock-pinned cards (`getDockCardIds`) are excluded from orphan promotion.
3. **Dexie init** — on mount, loads all tabs/tab_cards/cards/folders/index_entries in parallel; sets `isReady: true`. If no tabs exist, creates a default `'Main'` tab. Otherwise restores `activeTabId` from `localStorage` (falls back to the first tab if the saved id no longer exists).
4. **Tab Supabase sync** — when `userId` is set, saved tabs (`savedLocation !== 'none'`) sync to `user_tabs` via `tabSupabaseStorage` (debounced upsert on tab mutations).

### localStorage persistence

`activeTabId` is written to `localStorage` under the key `olive12:activeTabId` on every change (via a dedicated `useEffect`). On mount, the init effect reads this key to restore the last-selected tab across page reloads.

### StrictMode safety

All tab mutation functions compute their new values and await Dexie writes **before** calling any state setter. No side effects occur inside `setTabs` or `setActiveTabId` updater functions.

### Returns

**Tab state and navigation:**

| Property | Type | Description |
|---|---|---|
| `tab` | `Tab\|null` | Active tab; `null` before init |
| `tabs` | `Tab[]` | All tabs |
| `activeTabId` | `string\|null` | Id of the active tab |
| `isReady` | `boolean` | `true` once init is complete |
| `allTabCards` | `TabCard[]` | All tab_card join records (all tabs) |
| `cardsById` | `Record<string, Card>` | All cards keyed by id |
| `switchTab` | function | `(tabId)` — sets the active tab |
| `addTab` | function | `()` — creates a new tab, persists, switches to it |
| `removeTab` | function | `(tabId)` — deletes tab and all its tab_cards; switches to adjacent tab or creates a new default |
| `renameTab` | function | `(tabId, name)` — updates tab name, persists |
| `saveTabToShelf` | function | `(tabId)` — sets `savedLocation: 'shelf'`, persists |
| `moveTabToLibrary` | function | `(tabId, folderId?)` — sets `savedLocation: 'library'`, persists |
| `addToCardsById` | function | `(card)` — immediately registers a new card into `cardsById` without a Dexie read; used after dock card creation |

**Card state:**

| Property | Type | Description |
|---|---|---|
| `entries` | `Entry[]` | Cards for the active tab in position order: `{ card, position, foldState, hiddenState, indexEntry }`. `indexEntry` is the IndexEntry for the card (or its portal target); `null` if none exists. |
| `shelfEntries` | `Card[]` | All `location === 'shelf'` cards, sorted by `createdAt` asc |
| `libraryEntries` | `Card[]` | All `location === 'library'` cards, sorted by `updatedAt` desc |
| `shelfTabs` | `Tab[]` | All tabs with `savedLocation === 'shelf'` |
| `libraryTabs` | `Tab[]` | All tabs with `savedLocation === 'library'` |
| `folders` | `Folder[]` | All folders |
| `addTabCard` | function | `(cardId)` — adds an existing card to the active tab at the next position |
| `addPortalCard` | function | `(targetCardId) → card\|null` — creates portal card in active tab (see dedup guard below) |
| `updateCard` | function | `(cardId, fields)` — updates card, persists, schedules sync |
| `removeCard` | function | `(cardId)` — removes from state, Dexie, and Supabase (immediate delete, no debounce) |
| `reorder` | function | `(cardId, toPosition)` — reorders and persists all positions |
| `fold` | function | `(cardId)` — sets `foldState: true` |
| `unfold` | function | `(cardId)` — sets `foldState: false` |
| `hide` | function | `(cardId)` — sets `hiddenState: true` |
| `unhide` | function | `(cardId)` — sets `hiddenState: false` |
| `saveToShelf` | function | `(cardId)` — see behaviour below |
| `moveToLibrary` | function | `(cardId, folderId?)` — sets `location: 'library'` + `folderId`, schedules sync, then invokes `indexCard` (wiki-index) for library cards only |
| `createFolder` | function | `({ name?, parentId? }) → folder` — creates and persists folder |
| `runDockPrompt` | function | `async (promptText) → boolean` — invokes `dock-prompt` edge function, creates card on success |
| `promptLoading` | `boolean` | `true` while the edge function call is in flight |
| `promptError` | `string` | Error message from the last failed call; `''` when no error |
| `brainFeedItems` | `BrainFeedItem[]` | `{ cardId, title, reason: 'stale'\|'orphan' }` derived from library cards + index entries |
| `flipCard` | function | `(cardId)` — toggles flip state for the card (session-only, not persisted) |
| `isFlippedCard` | function | `(cardId) → boolean` — whether `cardId` is in the `flippedCardIds` Set |
| `reindexCard` | function | `(cardId, cardOverride?)` — manually invokes `wiki-index` and persists the result |

`shelfEntries`, `libraryEntries`, `shelfTabs`, and `libraryTabs` are derived — no extra storage calls.

### `saveToShelf` behaviour

When `saveToShelf(cardId)` is called:

1. Updates the card's `location` to `'shelf'` and persists it.
2. Finds every `tab_card` entry across all tabs that references `cardId`.
3. For each such entry, creates a **portal card** (`type: 'portal'`, `config: { target_card_id: cardId }`) at the same tab and position.
4. Removes the original tab_card entries from Dexie; persists the new portal cards and their tab_card entries.
5. Schedules sync.

Net result: the saved card moves to the vault shelf; every tab that had the card now shows a portal card in its place.

### `addPortalCard` dedup guard

Before creating a portal card, `addPortalCard` checks every card currently in the active tab:

- If any entry's card has `id === targetCardId` (the target card itself is already in the tab), returns `null` — no-op.
- If any entry's card is a portal with `config.target_card_id === targetCardId`, returns `null` — no-op.

## App layout

`App` owns session state. It renders:
- `null` while `sessionChecked` is false (avoids a flash)
- `<AuthForm>` when not authenticated
- `<RichTextEditorProvider><AppShell userId={userId}></RichTextEditorProvider>` when authenticated

`RichTextEditorProvider` wraps `AppShell` (not the other way around) so `AppShell` can call `useRichTextEditorContext()` to get `activeCardId` and `activeSurface` for the dock state machine.

`AppShell` receives `userId` and owns:
- `useTabs({ userId })` — all card, tab, folder, and prompt state
- `useDock({ cardsById, activeEditorCardId, activeSurface })` — dock card list, panel open state, dock state machine
- `folderPanelOpen` — whether `FolderPanel` is visible
- `promptOpen` — whether `DockPrompt` form is visible (not yet openable from UI — see [prompt.md](./prompt.md))
- `tabSwitcherOpen` — whether `TabSwitcher` overlay is visible
- `indexDebugOpen` — toggled via Settings button in Dock
- `lightningActive` — visual toggle state for the AI prompt button in the formatting toolbar (not yet wired to `promptOpen`)
- `vaultInitialTab` — which vault pane to open when locating a card
- `highlightedCardId` — card id to highlight in the vault after a locate action

Opening the folder panel closes any open dock card. Settings toggle closes the folder panel. Structure:

```
RichTextEditorProvider
  app-shell
    EmbedEntriesProvider
      TabHeader               ← sticky top: tab name (editable) + save button + Tab overview button
      app-shell__content      ← scrollable area
        Tab
      app-shell__dock-area    ← position: relative
        FolderPanel?          ← position: absolute, bottom: calc(100% - 2px)
        DockPrompt?           ← same slot, mutually exclusive (not yet reachable from UI)
        DockCardPanel?        ← above dock when activeDockCardId is set
        IndexDebugPanel?      ← role="dialog", shown when indexDebugOpen
        Dock
    TabSwitcher?              ← fixed full-screen overlay
```

**Key handlers in AppShell:**

| Handler | Trigger | Effect |
|---|---|---|
| `handleOpenAsPortal(cardId)` | Vault "Open in tab" button for a card | `addPortalCard(cardId)`, close panel |
| `handleOpenSavedTab(tabId)` | Vault "Switch to tab" button | `switchTab(tabId)`, close panel |
| `handleMoveTabToLibrary(tabId)` | Vault "Move to Library" on a tab | `moveTabToLibrary(tabId, null)` |
| `handleLocate(targetCardId)` | PortalCard "Show in vault" button | Looks up card location → sets `vaultInitialTab`, sets `highlightedCardId`, opens panel |
| `handleFolderOpen()` | Dock "Library" button | Closes any open dock card, toggles `folderPanelOpen` |
| `handleSettings()` | Dock / TabHeader "Settings" button | Closes folder panel, toggles `indexDebugOpen` |
| `handleTabOverview()` | TabHeader "Tab overview" button | Opens `TabSwitcher` |
| `handlePromptSubmit(text)` | DockPrompt Submit | Calls `runDockPrompt`, closes panel on success |

## Display components

### TabHeader

`TabHeader({ name, savedLocation, onRename, onSaveToShelf, onMoveToLibrary, onTabOverview })` — sticky bar above the content area.

- **Name editing:** clicking the `h2` switches to an `<input>` in-place. Enter or blur commits via `onRename`. Escape cancels.
- **Save button** (3 states):
  - `savedLocation === 'none'` and `onSaveToShelf` provided → `+` button (aria: "Save tab to Shelf")
  - `savedLocation === 'shelf'` → `✓` button (aria: "Tab saved to Shelf — click to move to Library"), calls `onMoveToLibrary`
  - `savedLocation === 'library'` → `✓` button, disabled (aria: "Tab in Library")
  - When neither callback is provided and no `onTabOverview`, no buttons render.
- **Tab overview button:** rendered only when `onTabOverview` is provided. `aria-label="Tab overview"`. Clicking opens the `TabSwitcher` dialog.

### TabSwitcher

`TabSwitcher({ tabs, activeTabId, tabEntries, onSwitch, onClose, onAdd, onRemoveTab, onSaveTab })` — full-screen dialog overlay.

- `role="dialog" aria-label="Tab switcher"`.
- Backdrop `div` behind the tile grid calls `onClose` on click.
- Escape key closes the switcher.
- **Tiles:** one per tab. Shows name, card count, and `savedLocation` badge. Close button (`aria-label="Close <name>"`). Save button when `savedLocation === 'none'`.
- Clicking a tile calls `onSwitch(tabId)`.
- **Add tile:** `+` tile at end, `aria-label="New tab"`, calls `onAdd`.

### Tab

`Tab({ entries, folders, cardsById, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary, onLocate, flipCard, isFlipped })` — presentational. Renders cards in position order.

**Portal card branching:** for each entry with `card.type === 'portal'`, renders `PortalCard` instead of `Card`. Binds `onUpdate` to the **target card's id**.

### Dock

`Dock({ dockState, dockCardEntries, activeDockCardId, onAddDockCard, onOpenDockCard, onFolderOpen, onSettings, onMoveDockCardToTab, onMoveToDock, lightningActive, onLightningToggle })` — bottom toolbar. Renders differently based on `dockState`:

**BASE state** (`role="toolbar" aria-label="Tab actions"`):
- Left: dock card pills (one per pinned card, highlighted when active) + "Pin new card" (`+`) button
- Divider
- Right: "Library" button (folder icon), "Settings" button (menu icon)

**DOCK_EDITOR state** (`role="toolbar" aria-label="Formatting options"`):
- Full `FormattingToolbar` (all TOOLBAR_ITEMS from `RichTextEditor`) + separator + "AI prompt" (lightning icon) + "Move card to tab" (arrow icon) + "Settings"
- Operates on `activeEditor` from `RichTextEditorContext`

**TAB_EDITOR state** (same structure as DOCK_EDITOR):
- `FormattingToolbar` + "AI prompt" + "Pin to dock" (pin icon) + "Settings"

The "AI prompt" lightning button is visible in both editor states and toggles `lightningActive` for visual feedback. It is not yet wired to open the `DockPrompt` panel.

### DockCardPanel

`DockCardPanel({ card, cardId, onClose, onUpdate })` — panel rendered above the Dock when a dock card is active.

- `role="complementary" aria-label="Dock card"`.
- Renders a `Card` component with `editorSurface="dock"`.
- Close button (aria: "Close dock panel") calls `onClose`.
- `onUpdate(fields)` delegates to `updateCard(cardId, fields)` in AppShell.

### DockPrompt

`DockPrompt({ onSubmit, onDismiss, loading, streaming, error })` — textarea + Send/Cancel buttons + inline error. Submit calls `onSubmit(trimmedText)`. Error displayed with `role="alert"`. Currently rendered by `AppShell` when `promptOpen` is true, but `promptOpen` is not yet set from the UI. See [prompt.md](./prompt.md).

### FolderPanel

Slide-up panel. Three tabs: **Shelf** (VaultTabRow tab entries + ShelfRow card entries), **Library** (VaultTabRow library tabs + FolderTree), **Brain** (`BrainFeed` with stale/orphan items). X button calls `onClose`. See [vault.md](./vault.md) and [brain.md](./brain.md).

## Tests

| File | What it covers |
|---|---|
| `createTab.test.js` | `createTab` defaults/custom/unique ids; `savedLocation`/`savedFolderId` defaults; `createTabCard` defaults; `nextPosition`; `reorderTabCard`; `setTabCardFold`; `setTabCardHidden`; `removeTabCard`; `updateTabFields`; `setTabName`; `removeTab` (removes and renumbers); `reorderTabs`; `saveTabToShelf`; `moveTabToLibrary` |
| `tabStorage.test.js` | Empty reads; `putTab` round-trip + upsert; `deleteTab`; `putTabCard` round-trip, foldState/hiddenState, position upsert; `deleteTabCard`; `deleteAllTabCards` |
| `dockCardStorage.test.js` | Empty read; `addDockCard` round-trip; order appended; `removeDockCard`; `getDockCardIds` returns sorted ids |
| `dockStateMachine.test.js` | BASE when nothing active; TAB_EDITOR when editor active (tab surface); DOCK_EDITOR when activeDockCardId set; DOCK_EDITOR when editing dock surface; TAB_EDITOR when editing with surface='tab' even if ids match |
| `useDock.test.js` | Loads dock card ids on mount; openDockCard sets active; closeDockCard clears; addToDock appends; removeFromDock clears active; createAndPinCard creates card + pins + opens + calls onCreated; moveDockCardToTab adds to tab if not already there, removes from dock |
| `useTabs.test.js` | Default tab on first mount; state loaded on mount; `addTabCard`; `addPortalCard` (creates portal, appends at end, dedup — same target twice is no-op, target card already in tab is no-op); `updateCard`; `removeCard`; `reorder`; `fold`/`unfold`; `hide`/`unhide`; `saveToShelf` (moves card to shelf, replaces tab instance with portal at same position, persists); `moveToLibrary` (state + Dexie + wiki-index invoke); `shelfEntries`/`libraryEntries` derivation + sort; `shelfTabs`/`libraryTabs` derivation; `createFolder`; `moveToLibrary` with folderId; remount persistence; multi-tab: `addTab`, `removeTab`, `renameTab`, `saveTabToShelf`, `moveTabToLibrary`, `switchTab`; localStorage: `activeTabId` persisted on switch, restored on remount; sync wiring: scheduler created, `runNow` called, `scheduleSync` on mutations, orphan card detection (dock-pinned excluded), `removeCard` with userId calls `deleteRemoteCard`; `runDockPrompt`: invoke args, card created, returns true/false, excludes hidden cards; `brainFeedItems` stale/orphan; `flipCard` toggles/un-flips; `isFlippedCard` boolean; `addToCardsById` immediately adds card to cardsById state |
| `TabHeader.test.jsx` | Renders name; click → edit mode; Enter commits; blur commits; Escape cancels; shelf state button; library state button (disabled); no buttons when no callbacks; Tab overview button renders/calls onTabOverview |
| `TabSwitcher.test.jsx` | Renders all tiles; active tile highlighted; card counts; shelf/library badges; switch on tile click; add tile; close on × click; close on backdrop click; Escape closes; remove tile calls `onRemoveTab`; save button calls `onSaveTab` |
| `Tab.test.jsx` | Empty state; renders title+body; fold hides body; hidden card class; position order; all callbacks; portal card renders target title/body; portal placeholder when null target; portal onUpdate routes to target id; null target not editable; onLocate called with target id |
| `Dock.test.jsx` | BASE: renders pill list, Pin new card, Library, Settings buttons; all BASE callbacks. DOCK_EDITOR: formatting toolbar buttons, Move card to tab button, Settings. TAB_EDITOR: formatting toolbar, Pin to dock, Settings. lightningActive styling |
| `DockCardPanel.test.jsx` | Returns null when no card; renders card heading; landmark role; close button calls onClose; Card body wrapper present |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; `onSubmit` with trimmed text; `onDismiss`; whitespace-only no-op; loading state; streaming spinner; error alert; no alert when error empty |
| `FolderPanel.test.jsx` | See vault.md |
| `AuthForm.test.jsx` | Inputs; buttons disabled when empty; enable on type; callbacks; error; loading |
| `App.test.jsx` | Dock renders Library + Pin new card; clicking Library opens folder panel; Settings opens IndexDebugPanel; Pin new card shows DockCardPanel; auth gate (logged in/out, signIn/signUp, error, confirmation); vault card lifecycle (save to shelf, refresh, close portal); tab switcher via TabHeader (opens dialog, shows New tab tile, Escape closes) |
| `e2e/tabs.spec.js` | Full flow: open switcher via TabHeader → create tab → rename → save to shelf → close original tab → verify; vault panel via Library button; Brain tab |

## Not built yet

- Smart tabs (`kind: 'smart'`)
- Drag-and-drop tab reorder (TabSwitcher tiles)
- Drag-and-drop card reorder
- Bulk-reveal hidden cards
- Search, tagging, filters
- Tab or tab_card Dexie-only sync (saved tabs sync via `user_tabs` when authenticated)
- Conflict UI (remote always wins on timestamp difference)
- Dock Prompt panel wiring to lightning button (component and edge function are ready; button exists in formatting toolbar but does not yet open the panel)
- Dock Prompt streaming, job queue, credits
- `onBrainAccept` re-index workflow (see [brain.md](./brain.md))
- Index debug off by default in production builds
- EmbeddedCardNode title display (currently shows `[[cardId]]` token; needs NodeView for live title lookup)
