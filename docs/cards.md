# Text cards — implementation

This document describes what is built today for text cards in olive12. It is the first vertical slice: create a card, show it in the UI, persist it to local storage, and reload it after a page refresh.

For the long-term vault design (tabs, shelf, library, dock, other card types), see [design.md](./design.md).

## Milestone

A card created through the UI survives a browser refresh.

Flow:

1. User enters a title and body in `CardShell` and clicks **Add card**.
2. `useCards` calls `createCard()` and appends the result to React state.
3. State change triggers `saveCards()` → `localStorage`.
4. On reload, `useCards` initialises from `loadCards()` and `Card` renders each stored card.

## File map

```
src/
  card/
    createCard.js          # Card factory (plain JS, no React)
    createCard.test.js
    createCard.stories.jsx
    Card.jsx               # Read-only display component
    Card.css
    Card.test.jsx
    Card.stories.jsx
    cardStorage.js         # localStorage read/write (plain JS, no React)
    cardStorage.test.js
    useCards.js            # React hook over storage
    useCards.test.js
    index.js               # Barrel exports
  CardShell.jsx            # Throwaway UI wiring hook → Card (mounted by App)
  CardShell.css
  CardShell.test.jsx
  App.jsx                  # Renders <CardShell />
```

Build order used for this slice:

1. **Data access** — `cardStorage.js` (tested in isolation)
2. **Hook** — `useCards.js` (wraps storage for React state)
3. **Shell** — `CardShell.jsx` (proves the round trip in the browser)

## Card data model

`createCard({ title = '', body = '' })` returns:

| Field       | Type   | Notes                          |
|-------------|--------|--------------------------------|
| `id`        | string | `crypto.randomUUID()`          |
| `type`      | string | Always `'text'` for now        |
| `title`     | string |                                |
| `body`      | string | Plain text; newlines preserved |
| `createdAt` | number | `Date.now()` at creation       |
| `updatedAt` | number | Same as `createdAt` for now    |

```js
import { createCard } from './card'

const card = createCard({ title: 'Notes', body: 'Buy milk' })
```

There is no update path yet — `updatedAt` is set once at creation and never changed.

## Display component

`Card({ title, body })` is read-only. It renders a bordered panel with a heading and body text. Line breaks in `body` are preserved via `white-space: pre-wrap`.

```jsx
import { Card } from './card'

<Card title="Meeting notes" body="Discuss roadmap" />
```

Styling lives in `Card.css` and uses the app’s CSS variables (`--border`, `--bg`, `--text`, etc.) from `index.css`.

## Storage

Plain functions with no React dependency.

| Function           | Behaviour |
|--------------------|-----------|
| `loadCards()`      | Reads key `olive12:cards` from `localStorage`. Returns `[]` if missing, invalid JSON, or not an array. |
| `saveCards(cards)` | Writes the full card array as JSON. |

```js
import { loadCards, saveCards } from './card'

saveCards([createCard({ title: 'Hi', body: 'There' })])
const cards = loadCards()
```

This is a stand-in for the eventual Dexie + Supabase sync described in [design.md](./design.md). The storage key and shape are intentionally simple so the hook and UI can be swapped later without changing `createCard` or `Card`.

## React hook

`useCards()` returns:

| Property   | Type       | Description |
|------------|------------|-------------|
| `cards`    | `Card[]`   | Current list, loaded from storage on mount |
| `addCard`  | `function` | `({ title, body }) => card` — creates via `createCard`, appends to state, persists |

Persistence runs in a `useEffect` whenever `cards` changes. Any future mutation that updates `cards` will auto-save without extra calls.

```jsx
import { useCards } from './card'

function MyList() {
  const { cards, addCard } = useCards()

  return (
    <>
      <button type="button" onClick={() => addCard({ title: 'New', body: '' })}>
        Add
      </button>
      {cards.map((card) => (
        <div key={card.id}>{card.title}</div>
      ))}
    </>
  )
}
```

Not exposed yet: update, delete, reorder, or per-tab fold/hide state.

## Throwaway shell

`CardShell` is temporary wiring to prove persistence. It is not the final tab/workspace UI.

- Form: title input, body textarea, **Add card** button
- List: one `Card` per stored item

`App.jsx` renders only `<CardShell />` until real layout work begins.

### Manual verification

```bash
npm run dev
```

1. Open the app in the browser.
2. Add a card with a title and body.
3. Refresh the page — the card should still appear.
4. Optional: DevTools → Application → Local Storage → `olive12:cards` to inspect the raw JSON.

## Tests

Run unit tests:

```bash
npm run test:run -- --project unit
```

| File | What it covers |
|------|----------------|
| `createCard.test.js` | Default fields, custom title/body, unique ids |
| `Card.test.jsx` | Renders title/body, preserves line breaks |
| `cardStorage.test.js` | Empty load, save/reload round trip, corrupt data |
| `useCards.test.js` | Load on mount, add + persist, remount reload |
| `CardShell.test.jsx` | UI create flow, remount survival |
| `App.test.jsx` | Shell mounts (title/body inputs, add button) |

The remount tests simulate a page refresh by unmounting and re-rendering the component tree while `localStorage` retains data.

## Storybook

```bash
npm run storybook
```

| Story file | Stories |
|------------|---------|
| `Card.stories.jsx` | Default, Empty, MultilineBody |
| `createCard.stories.jsx` | Default, Empty (JSON preview), WithContent |

`createCard` stories use small render helpers because the factory is not a component — some stories show raw JSON, others pipe output into `Card`.

## Not built yet

Explicitly out of scope for this slice (see [olive12.md](./olive12.md) and [design.md](./design.md)):

- Editing title or body after creation
- Deleting cards
- Fold / hide controls
- Additional card types (process, portal, container, transient)
- Tabs, dock, shelf, library, vault sync
- Rich text (Tiptap), embeds, drag-and-drop reorder
- Dexie / Supabase persistence

These are separate slices on top of the same `createCard` shape and `Card` display component.
