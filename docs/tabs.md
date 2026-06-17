# Tabs — implementation

This document describes what is built in the tabs slice (build13 and subsequent extensions). It covers the `tab` and `tab_card` data shapes, localStorage-backed storage, a React hook owning per-tab card state, a dumb `Tab` component, and supporting UI (`Dock`, `TransientCard`).

For the long-term vault design see [design.md](./design.md). For the card primitive this slice builds on, see [cards.md](./cards.md).

## Milestone

A single default tab with ordered, editable, removable cards. All state (order, fold, hidden, card content) survives a browser refresh.

Flow:

1. On first load, `useTabs` finds no stored tabs and auto-creates a "Main" tab, persisting it immediately.
2. User clicks **+** in the Dock. A `TransientCard` appears at the bottom of the feed for typing title and body.
3. On submit, `useTabs.addCard()` creates the card and a `tab_card` join entry and persists both.
4. Cards are displayed in position order. Folded cards show title only; hidden cards render at reduced opacity (`.card--hidden`) but remain in the DOM.
5. Clicking a card's title or body enters inline edit mode. Changes are committed on blur and persisted via `useTabs.updateCard()`.
6. Drag the resize handle at the bottom of a card body to shrink or expand it (ephemeral, not persisted).
7. On reload, `useTabs` rehydrates tabs, tab_cards, and cards from localStorage — order, fold, hidden, and content are all restored.

## File map

```
src/
  tab/
    createTab.js          # Tab + tab_card factories; pure helpers
    createTab.test.js     # [TEST] Unit tests for all pure functions
    tabStorage.js         # localStorage read/write for tabs and tab_cards (no React)
    tabStorage.test.js    # [TEST] Round-trip, empty, and corrupt-data tests
    useTabs.js            # React hook: auto-init default tab, owns all tab state
    useTabs.test.js       # [TEST] State-transition tests
    Tab.jsx               # Dumb component: entries → ordered, interactive cards
    Tab.css
    Tab.test.jsx          # [TEST]
    Tab.stories.jsx       # [STORY]
    Dock.jsx              # Sticky bottom bar with + button
    Dock.css
    Dock.test.jsx         # [TEST]
    TransientCard.jsx     # Inline card creation form (appears at bottom of feed)
    TransientCard.css
    TransientCard.test.jsx # [TEST]
    index.js              # Barrel exports for the tab module
  App.jsx                 # Composes useTabs + Tab + Dock + TransientCard
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

| Property     | Type       | Description |
|--------------|------------|-------------|
| `tab`        | `Tab\|null` | The active tab; `null` before init completes |
| `isReady`    | `boolean`  | `true` once async init has loaded all data from Dexie |
| `entries`    | `Entry[]`  | Cards in position order. Each entry: `{ card, position, foldState, hiddenState }` |
| `addCard`    | `function` | `({ title, body }) → card` — creates card + tab_card, persists both |
| `updateCard` | `function` | `(cardId, { title, body })` — updates card fields via `updateCardFields`, persists |
| `removeCard` | `function` | `(cardId)` — removes the tab_card entry and the card from state, persists both |
| `reorder`    | `function` | `(cardId, toPosition)` — reorders entries and renumbers positions |
| `fold`       | `function` | `(cardId)` — sets foldState to `true` |
| `unfold`     | `function` | `(cardId)` — sets foldState to `false` |
| `hide`           | `function` | `(cardId)` — sets hiddenState to `true` |
| `unhide`         | `function` | `(cardId)` — sets hiddenState to `false` |
| `saveToShelf`    | `function` | `(cardId)` — sets card `location` to `'shelf'`, persists via `putCard` |
| `moveToLibrary`  | `function` | `(cardId)` — sets card `location` to `'library'`, persists via `putCard` |

`location` is a data-only distinction in this slice — no Shelf/Library UI pane exists yet. The value is persisted to Dexie and surfaced via buttons on the card footer.

On first mount with no stored tabs, `useTabs` auto-creates and persists a "Main" tab. Initialisation is async: a single `useEffect` on mount awaits all three `getAllXxx()` calls in parallel, then sets state. Mutations call Dexie directly — there are no watcher `useEffect`s. `isReady` is `false` until init completes; `tab` is `null` and `entries` is `[]` during this window.

## Display component — Tab

`Tab({ entries, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary })` is presentational.

- Renders all entries in the order received (caller is responsible for sorting by `position` — `useTabs` pre-sorts).
- Passes fold/hidden state, toggle callbacks, reorder callbacks, update callback, and close callback into each `Card`.
- Toggle callbacks are computed inline (if folded → calls `onUnfold`; otherwise `onFold`; same pattern for hide/unhide).
- Reorder: first card has no up button; last card has no down button; single card has neither.
- Location buttons (`onSaveToShelf`, `onMoveToLibrary`) are forwarded to each `Card` with the card id bound; omitted when the parent does not supply the callback.
- Empty state: renders `"No cards yet."` message.

## Dock

`Dock({ onAdd, addDisabled })` is a sticky bottom bar (`position: sticky; bottom: 0`) containing a **+** button.

- `onAdd` is called when + is clicked.
- `addDisabled` disables the + button (set to `true` while a `TransientCard` is open to prevent multiple simultaneous forms).
- Renders as `role="toolbar" aria-label="Tab actions"`.

## TransientCard

`TransientCard({ onSubmit, onDismiss })` is an inline card-creation form that appears at the bottom of the feed.

- Shows a type picker row: **Text** is enabled; Process, Portal, Container are present but disabled (stubs for future slices).
- Title and body inputs with labels.
- **Add →** button calls `onSubmit({ title, body })`.
- **Cancel** button calls `onDismiss()`.
- `App` sets `transientOpen` state: `true` opens the TransientCard and disables the Dock +; `false` closes it on submit or dismiss.

## App wiring

`App.jsx` owns:
- `useTabs()` — all card and tab state
- `transientOpen` state — whether the TransientCard is showing
- `<Tab />` — renders the feed
- `<TransientCard />` — rendered below the feed when open
- `<Dock />` — sticky at the bottom, disabled while TransientCard is open

## Tests

| File | What it covers |
|------|----------------|
| `createTab.test.js` | `createTab` defaults + custom, unique ids; `createTabCard` defaults; `nextPosition`; `reorderTabCard` (later, earlier, same, not-found, clamp); `setTabCardFold`; `setTabCardHidden`; `removeTabCard` (removes entry, renumbers positions) |
| `tabStorage.test.js` | `loadTabs`/`loadTabCards` (empty, round-trip, invalid JSON, not-array, fold/hidden round-trip) |
| `useTabs.test.js` | Default tab on first mount, existing state loaded on mount, `addCard`, `updateCard`, `removeCard`, `reorder`, `fold`/`unfold`, `hide`/`unhide`, `saveToShelf`/`moveToLibrary` (state + Dexie persistence), remount restores state |
| `Tab.test.jsx` | Empty state, renders title+body, folded hides body, hidden card renders with `.card--hidden`, position order, Collapse/Expand/Dim/Show/Move/Remove buttons, callbacks called with correct cardId, `onUpdate` passed through, `onSaveToShelf`/`onMoveToLibrary` forwarded |
| `Dock.test.jsx` | Renders + button, calls onAdd, disabled state |
| `TransientCard.test.jsx` | Form fields, submit calls onSubmit with values, cancel calls onDismiss, disabled type stubs |
| `App.test.jsx` | + button opens TransientCard, disables dock while open, submit creates card and closes form, cancel closes without creating |

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Multiple tabs, tab switching UI, tab creation/deletion
- Smart tabs (`kind: 'smart'`)
- Drag-and-drop reorder (position is set via up/down buttons; drag-to-reorder is a separate slice)
- A "reveal hidden cards" panel or bulk-reveal filter
- Shelf, Library browsing UI / navigation (location value exists on cards but no separate pane)
- Portal, process, container card types
- Dexie or Supabase persistence
- `user_id` / multi-user
- Rich text, embeds
