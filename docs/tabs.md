# Tabs — implementation

This document describes what is built in the tabs slice (build13). It introduces the `tab` and `tab_card` data shapes, localStorage-backed storage, a React hook owning per-tab card order and fold/hidden state, a dumb `Tab` component, and wires one default tab into `App`.

For the long-term vault design see [design.md](./design.md). For the card primitive this slice builds on, see [cards.md](./cards.md).

## Milestone

A single default tab with ordered cards. Cards survive a browser refresh with their fold and hidden state intact.

Flow:

1. On first load, `useTabs` finds no stored tabs and auto-creates a "Main" tab, persisting it immediately.
2. User adds a card via the form in `App`. `useTabs.addCard()` creates the card and a `tab_card` join entry, saves both.
3. `Tab` renders the active tab's entries in position order. Folded cards show title only; hidden cards render at reduced opacity (`.card--hidden`) but remain in the DOM.
4. On reload, `useTabs` rehydrates tabs, tab_cards, and cards from localStorage — order, fold, and hidden state are all restored.

## File map

```
src/
  tab/
    createTab.js          # Tab + tab_card factories; pure helpers (nextPosition, reorderTabCard, setTabCardFold, setTabCardHidden)
    createTab.test.js     # [TEST] Unit tests for all pure functions
    tabStorage.js         # localStorage read/write for tabs and tab_cards (no React)
    tabStorage.test.js    # [TEST] Round-trip, empty, and corrupt-data tests for both keys
    useTabs.js            # React hook: auto-init default tab, owns ordered/filtered entries
    useTabs.test.js       # [TEST] State-transition tests: mount, addCard, reorder, fold/unfold, hide/unhide, remount
    Tab.jsx               # Dumb component: entries → ordered cards; passes fold/hide toggle callbacks into Card
    Tab.css               # Styles scoped to Tab
    Tab.test.jsx          # [TEST] Render, fold hides body, hidden card renders dimmed, button callbacks
    Tab.stories.jsx       # [STORY] Empty, MultipleCardsInOrder, OneFolded, OneHidden (dimmed)
    index.js              # Barrel exports for the tab module
  App.jsx                 # Modified: uses useTabs + Tab, replaces CardShell flat list
  App.css                 # Modified: added .app-shell form styles
  CardShell.jsx           # Unchanged (throwaway wiring from build12, kept until formally retired)
  CardShell.css           # Unchanged
  CardShell.test.jsx      # Unchanged
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

## Storage

Keys: `olive12:tabs` (tabs array) and `olive12:tab_cards` (tab_cards array).

| Function | Behaviour |
|---|---|
| `loadTabs()` | Reads `olive12:tabs`. Returns `[]` if missing, invalid JSON, or not an array. |
| `saveTabs(tabs)` | Writes full tabs array as JSON. |
| `loadTabCards()` | Reads `olive12:tab_cards`. Same fallback as above. |
| `saveTabCards(tabCards)` | Writes full tab_cards array as JSON. |

## React hook

`useTabs()` returns:

| Property  | Type       | Description |
|-----------|------------|-------------|
| `tab`     | `Tab`      | The active tab (always the first/only tab for now) |
| `entries` | `Entry[]`  | Cards in position order for the active tab. Each entry: `{ card, position, foldState, hiddenState }` |
| `addCard` | `function` | `({ title, body }) → card` — creates card + tab_card, appends to state, persists both |
| `reorder` | `function` | `(cardId, toPosition)` — reorders entries and renumbers positions |
| `fold`    | `function` | `(cardId)` — sets foldState to `true` |
| `unfold`  | `function` | `(cardId)` — sets foldState to `false` |
| `hide`    | `function` | `(cardId)` — sets hiddenState to `true` |
| `unhide`  | `function` | `(cardId)` — sets hiddenState to `false` |

On first mount with no stored tabs, `useTabs` auto-creates and persists a "Main" tab. Persistence runs in `useEffect`s watching the three state slices (`tab`, `tabCards`, `cardsById`).

## Display component

`Tab({ entries, onFold, onUnfold, onHide, onUnhide })` is read-only/presentational.

- Renders **all** entries (including hidden ones); hidden cards receive `hiddenState={true}` which applies `.card--hidden` opacity via `Card`.
- Renders entries in the order received (sort by `position` is the caller's responsibility — `useTabs` pre-sorts before returning `entries`).
- Passes `foldState`, `hiddenState`, and computed toggle callbacks (`onToggleFold`, `onToggleHide`) into each `Card`. Fold/hide controls now live inside `Card`'s `CardHeader`, not in `Tab` itself.
- Toggle callbacks are computed inline: if the entry is currently folded, the caret calls `onUnfold`; otherwise `onFold`. Same pattern for hide/unhide.
- Empty state: renders a `"No cards yet."` message.

## App wiring

`App.jsx` owns the add-card form (title, body, submit) and mounts `<Tab />`. `CardShell` is no longer rendered by `App` but its file and tests are unchanged.

## Test coverage

Run all unit tests:

```bash
npm run test:run -- --project unit
```

Run Storybook tests:

```bash
npm run test:run -- --project storybook
```

| File | What it covers |
|------|----------------|
| `createTab.test.js` | `createTab` defaults + custom, unique ids; `createTabCard` defaults; `nextPosition`; `reorderTabCard` (later, earlier, same, not-found, clamp); `setTabCardFold` (fold, unfold, immutability); `setTabCardHidden` (hide, unhide, immutability) |
| `tabStorage.test.js` | `loadTabs` (empty, round-trip, invalid JSON, not-array); `loadTabCards` (same + fold/hidden round-trip) |
| `useTabs.test.js` | Default tab created on first mount, existing state loaded on mount, `addCard` appends + persists, sequential positions, `reorder` changes order, `fold`/`unfold`, `hide`/`unhide`, remount restores state, remount preserves fold state |
| `Tab.test.jsx` | Empty state message, renders title+body, folded hides body, hidden card renders with `.card--hidden` class, position order, Collapse/Expand/Dim/Show buttons present, onFold/onUnfold/onHide/onUnhide called with correct cardId |
| `Tab.stories.jsx` | Empty, MultipleCardsInOrder, OneFolded, OneHidden (dimmed, not absent) |

Tests added build13: 40 unit + 4 storybook. Tests added card header/fold/hide styling pass: +21 unit + 7 storybook. Grand total: 83 unit + 18 storybook.

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Multiple tabs, tab switching UI, tab creation/deletion UI
- Smart tabs (`kind: 'smart'`)
- Drag-and-drop reorder (position is set programmatically; UI drag comes later)
- A dedicated "reveal hidden cards" panel or filter (dimmed cards are visible and can be un-dimmed via their eye button; a bulk-reveal or filtered view is not built)
- Dock, shelf, library
- Portal, process, container card types
- Dexie or Supabase persistence
- `user_id` / multi-user
- Card editing or deletion
- Rich text, embeds
