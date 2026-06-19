# Tabs — implementation

Tab and tab_card data shapes, Dexie-backed storage, the `useTabs` React hook, and the full UI layer (TabHeader, Tab, TabSwitcher, Dock, DockPrompt, TransientCard, FolderPanel).

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
    useTabs.js                # React hook: Dexie init, card/tab/folder state, sync wiring, prompt
    useTabs.test.js           # [TEST]
    TabHeader.jsx             # Dumb: inline-editable tab name + 3-state save button
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
    Dock.jsx                  # Bottom toolbar: scroll-top, add, folders, prompt, tab-overview, menu
    Dock.css
    Dock.test.jsx             # [TEST]
    Dock.stories.jsx          # [STORY]
    DockPrompt.jsx            # Dumb: prompt textarea + send + cancel + error
    DockPrompt.css
    DockPrompt.test.jsx       # [TEST]
    DockPrompt.stories.jsx    # [STORY]
    TransientCard.jsx         # Inline card-creation form (text mode + portal search mode)
    TransientCard.css
    TransientCard.test.jsx    # [TEST]
    TransientCard.stories.jsx # [STORY]
    index.js                  # Barrel exports
  App.jsx                     # App (session gate) + AppShell (composes all UI)
  App.css
  CardShell.jsx               # Thin wrapper used in CardShell-only contexts
  CardShell.test.jsx
supabase/
  functions/
    dock-prompt/
      index.ts                # Deno Edge Function: OpenRouter call → { title, body }
  migrations/
    20260618000000_create_cards.sql
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

### Three `useEffect` hooks

1. **Scheduler setup** — runs when `userId` changes. Creates a `makeCardSupabaseStorage` adapter (stored in `storageRef`) and a `createCardSyncScheduler` (stored in `schedulerRef`). Sets both to `null` when `userId` is absent.
2. **Initial reconcile** — runs once when `isReady` and `userId` are both truthy. Calls `runNow()` (pull remote → sync dirty), then detects **orphan cards** (cards in Dexie with no `tab_cards` entry — pulled from Supabase on another device) and auto-creates `tab_card` entries on the first tab.
3. **Dexie init** — on mount, loads all tabs/tab_cards/cards/folders in parallel; sets `isReady: true`. If no tabs exist, creates a default `'Main'` tab. Otherwise restores `activeTabId` from `localStorage` (falls back to the first tab if the saved id no longer exists).

### localStorage persistence

`activeTabId` is written to `localStorage` under the key `olive12:activeTabId` on every change (via a dedicated `useEffect`). On mount, the init effect reads this key to restore the last-selected tab across page reloads.

### StrictMode safety

All tab mutation functions (`addTab`, `removeTab`, `renameTab`, `saveTabToShelf`, `moveTabToLibrary`) compute their new values and await Dexie writes **before** calling any state setter. No side effects occur inside `setTabs` or `setActiveTabId` updater functions. This is required for React 18 StrictMode, which invokes updater functions twice in development.

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

**Card state:**

| Property | Type | Description |
|---|---|---|
| `entries` | `Entry[]` | Cards for the active tab in position order: `{ card, position, foldState, hiddenState }` |
| `shelfEntries` | `Card[]` | All `location === 'shelf'` cards, sorted by `createdAt` asc |
| `libraryEntries` | `Card[]` | All `location === 'library'` cards, sorted by `updatedAt` desc |
| `shelfTabs` | `Tab[]` | All tabs with `savedLocation === 'shelf'` |
| `libraryTabs` | `Tab[]` | All tabs with `savedLocation === 'library'` |
| `folders` | `Folder[]` | All folders |
| `addCard` | function | `({ title, body }) → card` — creates card + tab_card on active tab, persists, schedules sync |
| `addPortalCard` | function | `(targetCardId) → card\|null` — creates portal card in active tab (see dedup guard below) |
| `updateCard` | function | `(cardId, fields)` — updates card, persists, schedules sync |
| `removeCard` | function | `(cardId)` — removes from state, Dexie, and Supabase (immediate delete, no debounce) |
| `reorder` | function | `(cardId, toPosition)` — reorders and persists all positions |
| `fold` | function | `(cardId)` — sets `foldState: true` |
| `unfold` | function | `(cardId)` — sets `foldState: false` |
| `hide` | function | `(cardId)` — sets `hiddenState: true` |
| `unhide` | function | `(cardId)` — sets `hiddenState: false` |
| `saveToShelf` | function | `(cardId)` — see behaviour below |
| `moveToLibrary` | function | `(cardId, folderId?)` — sets `location: 'library'` + `folderId`, schedules sync |
| `createFolder` | function | `({ name?, parentId? }) → folder` — creates and persists folder |
| `runDockPrompt` | function | `async (promptText) → boolean` — invokes `dock-prompt` edge function, creates card on success |
| `promptLoading` | `boolean` | `true` while the edge function call is in flight |
| `promptError` | `string` | Error message from the last failed call; `''` when no error |

`shelfEntries`, `libraryEntries`, `shelfTabs`, and `libraryTabs` are derived — no extra storage calls.

### `saveToShelf` behaviour

When `saveToShelf(cardId)` is called:

1. Updates the card's `location` to `'shelf'` and persists it.
2. Finds every `tab_card` entry across all tabs that references `cardId`.
3. For each such entry, creates a **portal card** (`type: 'portal'`, `config: { target_card_id: cardId }`) at the same tab and position.
4. Removes the original tab_card entries from Dexie; persists the new portal cards and their tab_card entries.
5. Schedules sync.

Net result: the saved card moves to the vault shelf; every tab that had the card now shows a portal card in its place. The portal card reads and edits the shelf card's content live.

### `addPortalCard` dedup guard

Before creating a portal card, `addPortalCard` checks every card currently in the active tab:

- If any entry's card has `id === targetCardId` (the target card itself is already in the tab), returns `null` — no-op.
- If any entry's card is a portal with `config.target_card_id === targetCardId` (a portal to this target already exists), returns `null` — no-op.

This prevents duplicate representations of the same content in a single tab, regardless of how the card was opened (vault "Open in tab" button, TransientCard portal search, or programmatic call).

## App layout

`App` owns session state. It renders:
- `null` while `sessionChecked` is false (avoids a flash)
- `<AuthForm>` when not authenticated
- `<AppShell userId={userId}>` when authenticated

`AppShell` receives `userId` and owns:
- `useTabs({ userId })` — all card, tab, folder, and prompt state
- `folderPanelOpen` — whether `FolderPanel` is visible
- `transientOpen` — whether `TransientCard` form is open
- `promptOpen` — whether `DockPrompt` form is visible
- `tabSwitcherOpen` — whether `TabSwitcher` overlay is visible
- `vaultInitialTab` — which vault pane (`'shelf'` or `'library'`) to open to when `handleLocate` fires
- `highlightedCardId` — card id to highlight in the vault after a locate action

Opening `DockPrompt` closes `FolderPanel` and vice versa. `TabSwitcher` is independent and overlays the entire shell. Structure:

```
app-shell
  TabHeader                  ← sticky top bar: tab name (editable) + save button
  app-shell__content         ← scrollable area
    Tab
    TransientCard?
  app-shell__dock-area       ← position: relative
    FolderPanel?             ← position: absolute, bottom: calc(100% - 2px)
    DockPrompt?              ← same slot, mutual exclusive with FolderPanel
    Dock
TabSwitcher?                 ← fixed full-screen overlay, outside app-shell flow
```

**Key handlers in AppShell:**

| Handler | Trigger | Effect |
|---|---|---|
| `handleOpenAsPortal(cardId)` | Vault "Open in tab" button for a card | `addPortalCard(cardId)`, close panel |
| `handleSubmitPortal(cardId)` | TransientCard portal selection | `addPortalCard(cardId)`, close transient |
| `handleOpenSavedTab(tabId)` | Vault "Switch to tab" button | `switchTab(tabId)`, close panel |
| `handleMoveTabToLibrary(tabId)` | Vault "Move to Library" on a tab | `moveTabToLibrary(tabId, null)` |
| `handleLocate(targetCardId)` | PortalCard "Show in vault" (✓) button | Looks up card location → sets `vaultInitialTab`, sets `highlightedCardId`, opens panel |

## Display components

### TabHeader

`TabHeader({ name, savedLocation, onRename, onSaveToShelf, onMoveToLibrary })` — sticky bar above the content area.

- **Name editing:** clicking the `h2` switches to an `<input>` in-place. Enter or blur commits via `onRename`. Escape cancels and restores the original value.
- **Save button** (3 states):
  - `savedLocation === 'none'` and `onSaveToShelf` provided → `+` button, calls `onSaveToShelf`
  - `savedLocation === 'shelf'` → `✓` button (shelf state), calls `onMoveToLibrary` if provided
  - `savedLocation === 'library'` → `✓` button, disabled
- When neither callback is provided, no save button is rendered.

### TabSwitcher

`TabSwitcher({ tabs, activeTabId, tabEntries, onSwitch, onClose, onAdd, onRemoveTab, onSaveTab })` — full-screen dialog overlay.

- `role="dialog" aria-label="Tab switcher"`.
- Backdrop `div` behind the tile grid calls `onClose` on click.
- Escape key anywhere closes the switcher (via `document.addEventListener('keydown', ...)`).
- **Tiles:** one per tab. Shows name, card count, and a badge for `savedLocation` (`Shelf` / `Library`). Has a `×` close button (`aria-label="Close <name>"`) and a Save button when `savedLocation === 'none'`.
- Clicking a tile calls `onSwitch(tabId)`.
- **Add tile:** `+` tile at end, calls `onAdd`.
- `tabEntries` is `Record<tabId, Card[]>` — used to display card counts per tile.
- CSS animation: overlay fades in (`tab-switcher-in 150ms`); tiles stagger in (`tile-in 200ms`) using a `--tile-index` CSS custom property set inline.

### Tab

`Tab({ entries, folders, cardsById, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary, onLocate })` — presentational. Renders cards in position order. Each card receives all callbacks with the relevant cardId bound. Empty state renders `"No cards yet."`.

**Portal card branching:** for each entry with `card.type === 'portal'`, renders `PortalCard` instead of `Card`:
- Resolves target from `cardsById` using `card.config.target_card_id`.
- Binds `onUpdate` to the **target card's id** (not the portal card's id), so edits propagate to the source card and sync normally.
- Binds `onLocate` to `() => onLocate(target.id)` when both target and `onLocate` are available.

### Dock

`Dock({ onAdd, addDisabled, onScrollTop, onFolder, onPrompt, promptDisabled, onTabOverview, onMenu })` — fixed bottom toolbar, `role="toolbar"`.
- Left group: scroll-top caret, add card (`+`), folders, prompt (lightning bolt icon).
- Right group: tab overview (`aria-label="Tab overview"`), menu.
- `addDisabled` disables the `+` button while `TransientCard` is open.
- `promptDisabled` disables the prompt button while a prompt call is in flight.
- `onTabOverview` toggles the `TabSwitcher` overlay.

### DockPrompt

`DockPrompt({ onSubmit, onDismiss, loading, error })` — textarea + Send/Cancel buttons + inline error. Send button disabled when textarea is empty or `loading` is true. Submit calls `onSubmit(trimmedText)`. Error displayed with `role="alert"`.

### TransientCard

`TransientCard({ onSubmit, onDismiss, onSubmitPortal, shelfEntries, libraryEntries })` — inline card creation form with two modes.

**Text mode (default):** type row (Text active; Process/Container disabled), title input, body textarea, Add → / Cancel buttons.

**Portal mode:** activated by clicking the `Portal` type button. Shows a search input; typing filters all `shelfEntries` and `libraryEntries` by title. Clicking a result calls `onSubmitPortal(card.id)`. No match: "No cards found." message.

### FolderPanel

Slide-up panel. Three tabs: **Shelf** (VaultTabRow tab entries + ShelfRow card entries), **Library** (VaultTabRow library tabs + FolderTree), **Brain** (placeholder). X button calls `onClose`. See vault.md for full prop detail.

## Tests

| File | What it covers |
|---|---|
| `createTab.test.js` | `createTab` defaults/custom/unique ids; `savedLocation`/`savedFolderId` defaults; `createTabCard` defaults; `nextPosition`; `reorderTabCard`; `setTabCardFold`; `setTabCardHidden`; `removeTabCard`; `updateTabFields`; `setTabName`; `removeTab` (removes and renumbers); `reorderTabs`; `saveTabToShelf`; `moveTabToLibrary` |
| `tabStorage.test.js` | Empty reads; `putTab` round-trip + upsert; `deleteTab`; `putTabCard` round-trip, foldState/hiddenState, position upsert; `deleteTabCard`; `deleteAllTabCards` |
| `useTabs.test.js` | Default tab on first mount; state loaded on mount; `addCard`; `addPortalCard` (creates portal, appends at end, dedup — same target twice is no-op, target card already in tab is no-op); `updateCard`; `removeCard`; `reorder`; `fold`/`unfold`; `hide`/`unhide`; `saveToShelf` (moves card to shelf, replaces tab instance with portal at same position, persists); `moveToLibrary` (state + Dexie); `shelfEntries`/`libraryEntries` derivation + sort; `shelfTabs`/`libraryTabs` derivation; `createFolder`; `moveToLibrary` with folderId; remount persistence; multi-tab: `addTab`, `removeTab`, `renameTab`, `saveTabToShelf`, `moveTabToLibrary`, `switchTab`; localStorage: `activeTabId` persisted on switch, restored on remount; sync wiring: scheduler created, `runNow` called, `scheduleSync` on mutations, orphan card detection, `removeCard` with userId calls `deleteRemoteCard`; `runDockPrompt`: invoke args, card created, returns true/false, excludes hidden cards |
| `TabHeader.test.jsx` | Renders name and save button; click → edit mode; Enter commits; blur commits; Escape cancels; shelf state button; library state button (disabled); no button when no handlers |
| `TabSwitcher.test.jsx` | Renders all tiles; active tile highlighted; card counts; shelf/library badges; switch on tile click; add tile; close on × click; close on backdrop click; Escape closes; remove tile calls `onRemoveTab`; save button calls `onSaveTab` |
| `Tab.test.jsx` | Empty state; renders title+body; fold hides body; hidden card class; position order; all callbacks; portal card renders target title/body; portal placeholder when null target; portal onUpdate routes to target id; null target not editable; onLocate called with target id |
| `Dock.test.jsx` | All 6 buttons render; all callbacks including `onTabOverview`; `addDisabled`; `promptDisabled` |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; `onSubmit` with trimmed text; `onDismiss`; whitespace-only no-op; loading state; error alert; no alert when error empty |
| `TransientCard.test.jsx` | Form fields; submit; cancel; disabled type stubs; Portal button enabled; portal search mode filters entries; clicking result calls `onSubmitPortal`; no-match message |
| `FolderPanel.test.jsx` | See vault.md |
| `AuthForm.test.jsx` | Inputs; buttons disabled when empty; enable on type; callbacks; error; loading |
| `App.test.jsx` | Add card flow; dock disabled while transient open; Folders panel; Prompt button; DockPrompt open/close/submit; auth gate (logged in/out, signIn/signUp, error, confirmation); tab switcher opens/closes; new tab added via switcher |
| `e2e/tabs.spec.js` | Full flow: open switcher → create tab → rename → save to shelf → close original tab → verify remaining tab and shelf badge |

## Not built yet

- Smart tabs (`kind: 'smart'`)
- Drag-and-drop tab reorder (TabSwitcher tiles)
- Drag-and-drop card reorder
- Bulk-reveal hidden cards
- Search, tagging, filters
- Tab, tab_card, or folder sync to Supabase
- Conflict UI (remote always wins on timestamp difference)
- Dock Prompt streaming, job queue, credits
- Brain feed (currently placeholder)
- Moving a saved tab to a specific library folder (currently `moveTabToLibrary` always uses root)
