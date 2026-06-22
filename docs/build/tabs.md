# Tabs — implementation

Tab and tab_card data shapes, Dexie-backed storage, the `useTabs` and `useDock` React hooks, and the full UI layer (TabHeader, Tab, TabSwitcher, Dock, DockCardPanel, TransientCard, FolderPanel).

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
    parseDockPromptContent.js # Pure: parse title/body from model plain-text response
    parseDockPromptContent.test.js # [TEST]
    streamParser.js           # Pure: parse SSE delta line → string | null
    streamParser.test.js      # [TEST]
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
    tabVaultLogic.js          # Pure: isCardOnTab, isOrphanTabCandidate
    tabVaultLogic.test.js     # [TEST]
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
    Dock.jsx                  # 2-state toolbar (BASE / FORMATTING)
    Dock.css
    Dock.test.jsx             # [TEST]
    Dock.stories.jsx          # [STORY]
    DockCardPanel.jsx         # Dumb: Card editor panel for the active dock card
    DockCardPanel.css
    DockCardPanel.test.jsx    # [TEST]
    DockCardPanel.stories.jsx # [STORY]
    TransientCard.jsx         # Dumb: quick-create form shown in dock area
    TransientCard.css
    TransientCard.test.jsx    # [TEST]
    TransientCard.stories.jsx # [STORY]
    index.js                  # Barrel exports
  brain/
    createIndexEntry.js
    finishIndexResult.js
    indexCard.js
    indexEntryStorage.js
    brainFeedLogic.js
    BrainFeed.jsx / BrainFeedItem.jsx / BrainFeedList.jsx
  debug/
    indexPipelineDebug.js
    IndexDebugPanel.jsx
  card/
    flipLogic.js
    CardBack.jsx
    RichTextEditorContext.jsx
    RichTextEditor.jsx
    EmbeddedCardNode.js
    EmbeddedCardView.jsx
    EmbedEntriesContext.jsx
    EmbedSourcePanel.jsx
  App.jsx
  App.css
supabase/
  functions/
    dock-prompt/
      index.ts               # Deno Edge Function: streaming SSE OpenRouter call
    wiki-index/
      index.ts               # Deno Edge Function: card + neighbors → { title, tags, summary, links }
  migrations/
    20260618000000_create_cards.sql
    20260620000000_create_index_entries.sql
    20260620120000_create_user_tabs.sql
playwright.config.js
e2e/
  tabs.spec.js               # [E2E] Full tab management flow
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

1. `activeEditorCardId` is set **and** `activeSurface === 'dock'` → **DOCK_EDITOR**
2. `activeEditorCardId` is set (any other surface) → **TAB_EDITOR**
3. `activeDockCardId` is set → **DOCK_EDITOR**
4. Otherwise → **BASE**

Both `DOCK_EDITOR` and `TAB_EDITOR` render the same formatting toolbar. The distinction is used historically but the current Dock renders the same UI for both.

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
| `dockCardEntries` | `{ cardId, card }[]` | `dockCardIds` zipped with `cardsById`; entries with no matching card excluded |
| `activeDockCardId` | `string \| null` | Currently open dock card |
| `dockState` | `DOCK_STATE` | Computed from `computeDockState` |
| `openDockCard(cardId)` | function | Sets the active dock card |
| `closeDockCard()` | function | Clears the active dock card |
| `addToDock(cardId)` | async function | Pins an existing card to the dock |
| `removeFromDock(cardId)` | async function | Unpins a card; closes panel if it was active |
| `createAndPinCard(onCreated?)` | async function | Creates an empty card, pins it, opens it, calls `onCreated(card)` |
| `moveDockCardToTab(cardId, addTabCard)` | async function | Adds card to the active tab (if not already there), unpins from dock |

### `createAndPinCard` and `addToCardsById`

`createAndPinCard` accepts an optional `onCreated(card)` callback so the caller can immediately register the new card in `cardsById`. `AppShell` passes `addToCardsById` (from `useTabs`) as the callback.

## React hook — useTabs

`useTabs({ userId })` — `userId` is optional. When provided, sync is active.

### State

| State | Type | Description |
|---|---|---|
| `tabs` | `Tab[]` | All tabs, loaded from Dexie on mount |
| `activeTabId` | `string\|null` | Id of the currently displayed tab; restored from localStorage on mount |
| `tabCards` | `TabCard[]` | All tab_card join records (all tabs) |
| `cardsById` | `Record<string, Card>` | All cards keyed by id |
| `folders` | `Folder[]` | All folders |
| `isReady` | `boolean` | `true` once Dexie init is complete |
| `promptLoading` | `boolean` | `true` while the dock-prompt edge function is in flight |
| `promptError` | `string` | Error message from last failed prompt call; `''` when no error |
| `indexEntries` | `IndexEntry[]` | Wiki index records loaded from Dexie |
| `allLinks` | `Link[]` | All link records; refreshed after any card mutation |
| `flippedCardIds` | `Set<string>` | Card ids showing their back face (session-only, not persisted) |

### Four `useEffect` hooks

1. **Scheduler setup** — runs when `userId` changes. Creates a `makeCardSupabaseStorage` adapter and a `createCardSyncScheduler`. Sets both to `null` when `userId` is absent.
2. **Initial reconcile** — runs once when `isReady` and `userId` are both truthy. Calls `runNow()` (pull remote → sync dirty), then detects **orphan cards** (cards with no `tab_cards` entry and `location === 'none'`, excluding dock-pinned cards) and auto-creates `tab_card` entries on the first tab.
3. **Dexie init** — on mount, loads all tabs/tab_cards/cards/folders/index_entries/links in parallel; sets `isReady: true`. If no tabs exist, creates a default `'Main'` tab. Otherwise restores `activeTabId` from `localStorage`.
4. **localStorage persistence** — `activeTabId` is written to `localStorage` under `olive12:activeTabId` on every change.

### Returns

**Tab state and navigation:**

| Property | Type | Description |
|---|---|---|
| `tab` | `Tab\|null` | Active tab |
| `tabs` | `Tab[]` | All tabs |
| `activeTabId` | `string\|null` | Id of the active tab |
| `isReady` | `boolean` | `true` once init is complete |
| `allTabCards` | `TabCard[]` | All tab_card join records |
| `cardsById` | `Record<string, Card>` | All cards keyed by id |
| `switchTab` | function | `(tabId)` — sets the active tab |
| `addTab` | function | `()` — creates a new tab, persists, switches to it |
| `removeTab` | function | `(tabId)` — deletes tab + all tab_cards; for saved tabs, just switches away without deleting |
| `renameTab` | function | `(tabId, name)` — updates tab name, persists |
| `saveTabToShelf` | function | `(tabId)` — sets `savedLocation: 'shelf'`, persists |
| `moveTabToLibrary` | function | `(tabId, folderId?)` — sets `savedLocation: 'library'`, persists |
| `addToCardsById` | function | `(card)` — immediately registers a new card into `cardsById` without a Dexie read |

**Card state:**

| Property | Type | Description |
|---|---|---|
| `entries` | `Entry[]` | Cards for the active tab in position order: `{ card, position, foldState, hiddenState, indexEntry }` |
| `shelfEntries` | `Card[]` | All `location === 'shelf'` cards, sorted by `createdAt` asc |
| `libraryEntries` | `Card[]` | All `location === 'library'` cards, sorted by `updatedAt` desc |
| `shelfTabs` | `Tab[]` | All tabs with `savedLocation === 'shelf'` |
| `libraryTabs` | `Tab[]` | All tabs with `savedLocation === 'library'` |
| `folders` | `Folder[]` | All folders |
| `addCard` | function | `({ title, body })` — creates card and tab_card for active tab; returns card |
| `addTabCard` | function | `(cardId)` — adds an existing card to the active tab |
| `addPortalCard` | function | `(targetCardId) → card\|null` — creates portal card in active tab (dedup guard below) |
| `updateCard` | function | `(cardId, fields)` — updates card, persists, schedules sync; triggers re-index if library |
| `removeCard` | function | `(cardId)` — removes from state, Dexie, and Supabase (immediate delete) |
| `detachCardFromTab` | function | `(cardId)` — removes tab_card only (card stays in Dexie, e.g. when moving to dock) |
| `reorder` | function | `(cardId, toPosition)` — reorders and persists all positions |
| `fold` / `unfold` | function | `(cardId)` — sets `foldState: true/false` |
| `hide` / `unhide` | function | `(cardId)` — sets `hiddenState: true/false` |
| `saveToShelf` | function | `(cardId)` — see behaviour below |
| `moveToLibrary` | function | `(cardId, folderId?)` — sets `location: 'library'` + `folderId`, schedules sync, then invokes `reindexCard` |
| `createFolder` | function | `({ name?, parentId? }) → folder` — creates and persists folder |
| `runDockPrompt` | function | `async (promptText) → boolean` — streaming AI card creation; returns `true` on success |
| `promptLoading` | `boolean` | `true` while the streaming call is in flight |
| `promptError` | `string` | Error from last failed call; `''` when no error |
| `brainFeedItems` | `BrainFeedItem[]` | `{ cardId, title, reason }` from library cards + index entries |
| `flipCard` | function | `(cardId)` — toggles flip state (session-only) |
| `isFlippedCard` | function | `(cardId) → boolean` |
| `reindexCard` | function | `(cardId, cardOverride?)` — manually invokes `wiki-index` and persists the result |

### `saveToShelf` behaviour

When `saveToShelf(cardId)` is called:

1. Updates the card's `location` to `'shelf'` and persists it.
2. Finds every `tab_card` entry across all tabs that references `cardId`.
3. For each such entry, creates a **portal card** at the same tab and position.
4. Removes the original tab_card entries; persists the portal cards and their tab_card entries.
5. Schedules sync.

Net result: the saved card moves to the vault shelf; every tab that had the card now shows a portal card in its place.

### `addPortalCard` dedup guard

Before creating a portal card, checks the active tab for any entry whose card id equals `targetCardId` or is a portal with `config.target_card_id === targetCardId`. If found, returns `null` — no-op.

### `runDockPrompt` streaming

`runDockPrompt` now streams from the edge function using `fetch` (not `supabase.functions.invoke`, which may buffer). Flow:

1. Creates an empty card immediately — it appears in the tab at once.
2. Opens an SSE stream from `dock-prompt`.
3. Parses each `data:` line via `parseStreamChunk` to extract delta text.
4. As soon as the first `\n` is found in the accumulated text, extracts the title and sets it; subsequent deltas update the body in batches via `requestAnimationFrame`.
5. On stream end, applies the final title + body via `parseDockPromptContent`.
6. Falls back to JSON parsing if no SSE deltas were received (legacy function format).

## App layout

`App` owns session state. It renders:
- `null` while `sessionChecked` is false
- `<AuthForm>` when not authenticated
- `<RichTextEditorProvider><AppShell userId={userId}></RichTextEditorProvider>` when authenticated

`AppShell` owns:
- `useTabs({ userId })` — all card, tab, folder, and prompt state
- `useDock({ cardsById, activeEditorCardId, activeSurface })` — dock card list, panel open state, dock state machine
- `folderPanelOpen` — whether `FolderPanel` is visible
- `promptOpen` — whether `DockPrompt` form is visible
- `embedOpen` — whether `EmbedSourcePanel` is visible (opened from Dock's `[[]]` button)
- `tabSwitcherOpen` — whether `TabSwitcher` overlay is visible
- `indexDebugOpen` — toggled via Settings button in Dock

**EmbedActionsProvider** wraps AppShell content providing `onSaveToShelf`, `onMoveToDock`, `onMoveToTab`, `onUpdate` to `EmbeddedCardView` nodes.

**EmbedEntriesProvider** wraps AppShell content providing `Object.values(cardsById)` to `EmbeddedCardView`.

Structure:

```
RichTextEditorProvider
  app-shell
    EmbedActionsProvider
      EmbedEntriesProvider
        TabHeader               ← sticky top
        app-shell__content      ← scrollable area
          Tab
        app-shell__dock-area    ← position: relative
          FolderPanel?          ← position: absolute, bottom: calc(100% - 2px)
          DockPrompt?           ← same slot, mutually exclusive
          EmbedSourcePanel?     ← same slot
          DockCardPanel?        ← above dock when activeDockCardId is set
          IndexDebugPanel       ← role="dialog", always rendered, hidden when !indexDebugOpen
          Dock
    TabSwitcher?                ← fixed full-screen overlay
```

**Key handlers in AppShell:**

| Handler | Trigger | Effect |
|---|---|---|
| `handleOpenAsPortal(cardId)` | Vault "Open in tab" button | `addPortalCard(cardId)`, close panel |
| `handleOpenSavedTab(tabId)` | Vault "Switch to tab" button | `switchTab(tabId)`, close panel |
| `handleMoveTabToLibrary(tabId)` | Vault "Move to Library" on tab | `moveTabToLibrary(tabId, null)` |
| `handleLocate(targetCardId)` | PortalCard "Show in vault" button | Sets `vaultInitialTab`, sets `highlightedCardId`, opens panel |
| `handleFolderOpen()` | Dock "Library" button | Closes any open dock card, toggles `folderPanelOpen` |
| `handleEmbedOpen()` | Dock `[[]]` button | Stores `activeEditor` ref, toggles `embedOpen` |
| `handleEmbedSelect(cardId)` | EmbedSourcePanel card click | Inserts `embeddedCard` node into stored editor, closes panel |
| `handleEmbedCreate()` | EmbedSourcePanel "New card" | Creates empty card, puts in Dexie + cardsById, inserts node |
| `handleSettings()` | Dock "Settings" button | Closes folder panel, toggles `indexDebugOpen` |
| `handleTabOverview()` | TabHeader "Tab overview" button | Opens `TabSwitcher` |
| `handlePromptSubmit(text)` | DockPrompt Submit | Calls `runDockPrompt`; closes panel on success |

## Display components

### TabHeader

`TabHeader({ name, savedLocation, onRename, onSaveToShelf, onMoveToLibrary, onTabOverview })` — sticky bar above the content area.

- **Name editing:** clicking the `h2` switches to an `<input>` in-place. Enter or blur commits. Escape cancels.
- **Save button** (3 states): `savedLocation === 'none'` → `+` button; `'shelf'` → `✓` calls `onMoveToLibrary`; `'library'` → `✓` disabled.
- **Tab overview button:** rendered when `onTabOverview` provided. Clicking opens `TabSwitcher`.

### TabSwitcher

`TabSwitcher({ tabs, activeTabId, tabEntries, onSwitch, onClose, onAdd, onRemoveTab, onSaveTab })` — full-screen dialog overlay.

- Backdrop calls `onClose` on click; Escape closes.
- **Tiles:** name, card count, `savedLocation` badge. Close and save buttons per tile.
- **Add tile:** `+` tile at end.

### Tab

`Tab({ entries, folders, cardsById, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary, onLocate, onMoveToDock, flipCard, isFlipped })` — presentational.

**Callbacks from Tab to Card:**
- Text cards: `onSaveToShelf`, `onSendToDock` (bound to `onMoveToDock`). No `onFlip`, no `onMoveUp`, no `onMoveDown`.
- Portal cards: no `onSaveToShelf` — portal cards cannot be saved.
- All cards: `onToggleFold`, `onToggleHide`, `onClose`, `onUpdate`.

Note: `flipCard` and `isFlipped` are accepted as props by `Tab` (and passed from `AppShell`) but are not wired to any card rendering in the current implementation. Card flip from the tab layer is not functional.

Portal card branching: for each entry with `card.type === 'portal'`, renders `PortalCard` instead of `Card`. Binds `onUpdate` to the **target card's id**.

### Dock

`Dock({ dockState, dockCardEntries, activeDockCardId, onAddDockCard, onOpenDockCard, onFolderOpen, onSettings, onEmbedOpen, lightningActive, onLightningToggle })` — bottom toolbar.

**BASE state** (`role="toolbar" aria-label="Tab actions"`):
- Left: dock card pills (one per pinned card, `.dock__pill--active` when active) + `+` button (`aria-label="Pin new card"`)
- Divider
- Right: "Library" button (folder icon), "Settings" button (menu icon)

**DOCK_EDITOR or TAB_EDITOR state** (`role="toolbar" aria-label="Formatting options"`):
- `FormattingToolbar` (scrollable): Exit editor (`‹`), separator, AI prompt (lightning), Embed card (`[[]]`), separator, Undo, Redo, separator, Heading (expandable H1/H2/H3), Bold, Italic, Highlight, Code block, Bullet list, Ordered list, Indent, Outdent, Checkbox list, Strikethrough.
- No "Move card to tab", no "Pin to dock", no "Settings" buttons in the formatting toolbar.
- Exit editor (`‹`) calls `activeEditor?.commands.blur()`.
- AI prompt button toggles `lightningActive` via `onLightningToggle`.
- Embed card (`[[]]`) calls `onEmbedOpen`.

Both editor states render the same `FormattingToolbar` component.

### DockCardPanel

`DockCardPanel({ card, cardId, onClose, onUpdate, onMoveToTab })` — panel rendered above the Dock when a dock card is active.

- `role="complementary" aria-label="Dock card"`.
- Renders a `Card` with `editorSurface="dock"`.
- `Card` is given: `onToggleFold` (local state), `onClose`, `onUpdate`, `onSendToTab` (`onMoveToTab`).
- No `onFlip`, no `onSaveToShelf`, no `onSendToDock` on the dock card.
- `onClose` removes the card from the dock entirely (`removeFromDock` in AppShell).
- `onMoveToTab` calls `moveDockCardToTab(cardId, addTabCard)` — moves card to active tab, removes from dock.

### TransientCard

`TransientCard({ onSubmit, onDismiss, onSubmitPortal, shelfEntries, libraryEntries })` — quick-create form.

- Type selector pills: **Text** (enabled), **Portal** (enabled), **Process** (disabled), **Container** (disabled).
- **Text mode:** title input + body textarea + "Add →" submit button. `onSubmit({ title, body })` on submit.
- **Portal mode:** search input that filters all vault cards (`shelfEntries + libraryEntries`). Clicking a result calls `onSubmitPortal(cardId)`.
- Dismiss (✕) calls `onDismiss`.

Currently rendered by the dock area, but not wired up in AppShell — see "Not built yet".

### DockPrompt

`DockPrompt({ onSubmit, onDismiss, loading, error })` — textarea + Send/Cancel buttons + inline error.

- Send disabled when textarea empty or `loading`.
- Error displayed with `role="alert"`.
- Rendered by `AppShell` when `promptOpen` is true.
- `promptOpen` is not yet set from the Dock's lightning button — see "Not built yet".

### FolderPanel

Slide-up panel with three tabs: **Shelf**, **Library**, **Brain**. X button calls `onClose`. See [vault.md](./vault.md) and [brain.md](./brain.md). `onReindex` prop (new) passed through to BrainFeed for manual re-index.

## Tests

| File | What it covers |
|---|---|
| `createTab.test.js` | `createTab` defaults/custom/unique ids; `savedLocation`/`savedFolderId` defaults; `createTabCard` defaults; `nextPosition`; `reorderTabCard`; `setTabCardFold`; `setTabCardHidden`; `removeTabCard`; `updateTabFields`; `setTabName`; `removeTab`; `reorderTabs`; `saveTabToShelf`; `moveTabToLibrary` |
| `tabStorage.test.js` | Empty reads; `putTab` round-trip + upsert; `deleteTab`; `putTabCard` round-trip, foldState/hiddenState, position upsert; `deleteTabCard`; `deleteAllTabCards` |
| `dockCardStorage.test.js` | Empty read; `addDockCard` round-trip; order appended; `removeDockCard`; `getDockCardIds` sorted |
| `dockStateMachine.test.js` | BASE when nothing active; TAB_EDITOR when editor active (tab surface); DOCK_EDITOR when activeDockCardId set; DOCK_EDITOR when editing dock surface; TAB_EDITOR when editing with surface='tab' even if ids match |
| `useDock.test.js` | Loads dock card ids on mount; openDockCard sets active; closeDockCard clears; addToDock appends; removeFromDock clears active; createAndPinCard creates+pins+opens+calls onCreated; moveDockCardToTab adds to tab if not already there, removes from dock |
| `useTabs.test.js` | Default tab on first mount; state loaded on mount; `addTabCard`; `addPortalCard` (creates portal, appends, dedup); `updateCard`; `removeCard`; `detachCardFromTab`; `reorder`; `fold`/`unfold`; `hide`/`unhide`; `saveToShelf`; `moveToLibrary` (state + Dexie + wiki-index); `shelfEntries`/`libraryEntries`; `shelfTabs`/`libraryTabs`; `createFolder`; remount persistence; multi-tab; localStorage; sync wiring; orphan card detection; `runDockPrompt`; `brainFeedItems`; `flipCard`/`isFlippedCard`; `addToCardsById` |
| `TabHeader.test.jsx` | Renders name; click → edit mode; Enter/blur commits; Escape cancels; shelf state; library state (disabled); no buttons without callbacks; Tab overview button |
| `TabSwitcher.test.jsx` | Renders all tiles; active tile highlighted; card counts; shelf/library badges; switch on tile click; add tile; close on ×; backdrop click; Escape closes; remove tile; save button |
| `Tab.test.jsx` | Empty state; renders title+body; fold hides body; hidden card class; position order; callbacks (fold/unfold/hide/unhide/remove/save); portal card renders target; portal placeholder; portal onUpdate routes to target id; null target not editable; onLocate with target id; inline update |
| `Dock.test.jsx` | BASE: pill list, active pill class, Pin new card, Library, Settings, pill click calls onOpenDockCard, no formatting buttons. DOCK_EDITOR: Exit editor, Bold/Italic/all toolbar buttons, expandable Heading, AI prompt/lightning, Embed [[]], no Move-card-to-tab, no Settings, no Pin-to-dock, no pills, lightningActive aria-pressed. TAB_EDITOR: same formatting toolbar, no Pin-to-dock, no Move-card-to-tab, no Settings. |
| `DockCardPanel.test.jsx` | Returns null when no card; renders card heading; landmark role; close button calls onClose (Remove card); fold toggle present and works; no flip button; Move to tab button present/absent; calls onMoveToTab; Card body wrapper present |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; `onSubmit` with trimmed text; `onDismiss`; whitespace-only no-op; loading state; error alert; no alert when error empty |
| `AuthForm.test.jsx` | Inputs; buttons disabled when empty; enable on type; callbacks; error; loading |
| `App.test.jsx` | Dock renders Library + Pin new card; clicking Library opens folder panel; Settings opens IndexDebugPanel; Pin new card shows DockCardPanel; auth gate; vault card lifecycle; tab switcher; embed panel |
| `e2e/tabs.spec.js` | Full flow: open switcher via TabHeader → create tab → rename → save to shelf → close original tab → verify; vault panel via Library button; Brain tab |

## Not built yet

- Drag-and-drop tab reorder (TabSwitcher tiles)
- Drag-and-drop card reorder within a tab
- Flip wiring from Tab layer (Tab accepts `flipCard`/`isFlipped` props but they are not wired to Card rendering)
- Bulk-reveal hidden cards
- Search, tagging, filters
- Conflict UI (remote always wins on timestamp difference)
- Lightning button → DockPrompt panel wiring (button exists; panel and logic are ready but `setPromptOpen` not called from Dock)
- TransientCard wired to the dock (component exists, not rendered from AppShell)
- Dock Prompt streaming cancel / abort
- `onBrainAccept` re-index workflow
- Index debug off by default in production builds
- Smart tabs (`kind: 'smart'`)
