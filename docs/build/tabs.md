# Tabs — implementation

Tab and tab_card data shapes, Dexie-backed storage, the `useTabs` React hook, and the full UI layer (Tab, Dock, DockPrompt, TransientCard, FolderPanel).

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
    ShelfRow.jsx              # Compact row for shelf entries in FolderPanel
    ShelfRow.css
    ShelfRow.test.jsx         # [TEST]
    ShelfRow.stories.jsx      # [STORY]
    FolderTree.jsx            # Recursive folder tree for Library view
    FolderTree.css
    FolderTree.test.jsx       # [TEST]
    FolderTree.stories.jsx    # [STORY]
  tab/
    createTab.js              # Tab + tab_card factories; pure helpers
    createTab.test.js         # [TEST]
    tabStorage.js             # Per-record tab and tab_card operations (pure, no React)
    tabStorage.test.js        # [TEST]
    useTabs.js                # React hook: Dexie init, card/tab/folder state, sync wiring, prompt
    useTabs.test.js           # [TEST]
    Tab.jsx                   # Dumb: entries → ordered, interactive cards
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
    TransientCard.jsx         # Inline card-creation form (appears in content area)
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

| Function | Description |
|---|---|
| `nextPosition(tabCards)` | Returns `tabCards.length` — append position |
| `reorderTabCard(tabCards, cardId, toPosition)` | Returns new array with card moved; all positions renumbered |
| `setTabCardFold(tabCards, cardId, foldState)` | Returns new array with matching card's `foldState` updated |
| `setTabCardHidden(tabCards, cardId, hiddenState)` | Returns new array with matching card's `hiddenState` updated |
| `removeTabCard(tabCards, cardId)` | Returns new array with card removed; positions renumbered |

## React hook — useTabs

`useTabs({ userId })` — `userId` is optional. When provided, sync is active.

**Three `useEffect` hooks:**

1. **Scheduler setup** — runs when `userId` changes. Creates a `makeCardSupabaseStorage` adapter (stored in `storageRef`) and a `createCardSyncScheduler` (stored in `schedulerRef`). Sets both to `null` when `userId` is absent.
2. **Initial reconcile** — runs once when `isReady` and `userId` are both truthy. Calls `runNow()` (pull remote → sync dirty), then detects **orphan cards** (cards in Dexie `cards` with no `tab_cards` entry — pulled from Supabase on another device) and auto-creates `tab_card` entries for them.
3. **Dexie init** — on mount, loads all tabs/tab_cards/cards/folders in parallel; sets `isReady: true`.

**Returns:**

| Property | Type | Description |
|---|---|---|
| `tab` | `Tab\|null` | Active tab; `null` before init |
| `isReady` | `boolean` | `true` once init is complete |
| `entries` | `Entry[]` | Cards in position order: `{ card, position, foldState, hiddenState }` |
| `shelfEntries` | `Card[]` | All `location === 'shelf'` cards, sorted by `createdAt` asc |
| `libraryEntries` | `Card[]` | All `location === 'library'` cards, sorted by `updatedAt` desc |
| `folders` | `Folder[]` | All folders |
| `addCard` | function | `({ title, body }) → card` — creates card + tab_card, persists, schedules sync |
| `updateCard` | function | `(cardId, fields)` — updates card, persists, schedules sync |
| `removeCard` | function | `(cardId)` — removes from state, Dexie, and Supabase (immediate delete, no debounce) |
| `reorder` | function | `(cardId, toPosition)` — reorders and persists all positions |
| `fold` | function | `(cardId)` — sets `foldState: true` |
| `unfold` | function | `(cardId)` — sets `foldState: false` |
| `hide` | function | `(cardId)` — sets `hiddenState: true` |
| `unhide` | function | `(cardId)` — sets `hiddenState: false` |
| `saveToShelf` | function | `(cardId)` — sets `location: 'shelf'`, schedules sync |
| `moveToLibrary` | function | `(cardId, folderId?)` — sets `location: 'library'` + `folderId`, schedules sync |
| `createFolder` | function | `({ name?, parentId? }) → folder` — creates and persists folder |
| `runDockPrompt` | function | `async (promptText) → boolean` — invokes `dock-prompt` edge function, creates card on success |
| `promptLoading` | `boolean` | `true` while the edge function call is in flight |
| `promptError` | `string` | Error message from the last failed call; `''` when no error |

`shelfEntries` and `libraryEntries` are derived from `cardsById` — no extra storage calls.

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

Opening `DockPrompt` closes `FolderPanel` and vice versa. Structure:

```
app-shell
  app-shell__content       ← scrollable area
    Tab
    TransientCard?
  app-shell__dock-area     ← position: relative
    FolderPanel?           ← position: absolute, bottom: calc(100% - 2px)
    DockPrompt?            ← same slot, mutual exclusive with FolderPanel
    Dock
```

## Display components

### Tab
`Tab({ entries, folders, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary })` — presentational. Renders cards in position order. Each `Card` receives all callbacks with the relevant cardId bound. Empty state renders `"No cards yet."`.

### Dock
`Dock({ onAdd, addDisabled, onScrollTop, onFolder, onPrompt, promptDisabled, onTabOverview, onMenu })` — fixed bottom toolbar, `role="toolbar"`.
- Left group: scroll-top caret, add card (`+`), folders, prompt (lightning bolt icon).
- Right group: tab overview, menu.
- `addDisabled` disables the `+` button while `TransientCard` is open.
- `promptDisabled` disables the prompt button while a prompt call is in flight.

### DockPrompt
`DockPrompt({ onSubmit, onDismiss, loading, error })` — textarea + Send/Cancel buttons + inline error. Send button disabled when textarea is empty or `loading` is true. Submit calls `onSubmit(trimmedText)`. Error displayed with `role="alert"`.

### TransientCard
`TransientCard({ onSubmit, onDismiss })` — inline card creation form: type row (Text only; Process/Portal/Container present but disabled), title input, body textarea, Add → / Cancel buttons. Appears in the content area above the dock.

### FolderPanel
Slide-up panel. Three tabs: **Shelf** (ShelfRow entries), **Library** (FolderTree), **Brain** (placeholder). X button calls `onClose`. See vault.md for full detail.

## Tests

| File | What it covers |
|---|---|
| `createTab.test.js` | createTab defaults/custom/unique ids; createTabCard defaults; nextPosition; reorderTabCard; setTabCardFold; setTabCardHidden; removeTabCard |
| `tabStorage.test.js` | Empty reads, putTab round-trip, upsert; putTabCard round-trip, foldState/hiddenState, position upsert, deleteTabCard |
| `useTabs.test.js` | Default tab on first mount, state loaded on mount, addCard, updateCard, removeCard, reorder, fold/unfold, hide/unhide, saveToShelf/moveToLibrary (state + Dexie), shelfEntries/libraryEntries derivation + sort, createFolder, moveToLibrary with folderId, remount persistence; sync wiring (scheduler created, runNow called, scheduleSync on mutations, orphan card detection, removeCard with userId calls deleteRemoteCard); runDockPrompt (invoke called with correct args, card created from response, returns true/false, excludes hidden cards from context) |
| `Tab.test.jsx` | Empty state, renders title+body, fold hides body, hidden card class, position order, all callbacks |
| `Dock.test.jsx` | All 6 buttons render; all callbacks; addDisabled; promptDisabled |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; onSubmit with trimmed text; onDismiss; whitespace-only no-op; loading state; error alert; no alert when error empty |
| `TransientCard.test.jsx` | Form fields, submit, cancel, disabled type stubs |
| `FolderPanel.test.jsx` | Tabs; close; shelf/library/brain content; onMoveToLibrary |
| `AuthForm.test.jsx` | Inputs; buttons disabled when empty; enable on type; callbacks; error; loading |
| `App.test.jsx` | Add card flow; dock disabled while transient open; Folders panel; Prompt button; DockPrompt open/close/submit; auth gate (logged in/out, signIn/signUp, error, confirmation) |

## Not built yet

- Multiple tabs, tab switching, tab creation/deletion
- Smart tabs (`kind: 'smart'`)
- Drag-and-drop reorder
- Bulk-reveal hidden cards
- Search, tagging, filters
- Portal, process, container card types
- Tab, tab_card, or folder sync to Supabase
- Conflict UI (remote always wins on timestamp difference)
- Dock Prompt streaming, job queue, credits
- Brain feed (currently placeholder)
