# Text cards — implementation

This document describes what is built today for text cards in olive12.

For the long-term vault design (tabs, shelf, library, dock, other card types), see [design.md](./design.md).

## File map

```
src/
  card/
    createCard.js          # Card factory + updateCardFields (plain JS, no React)
    createCard.test.js
    createCard.stories.jsx
    CardHeader.jsx         # Dumb header strip: fold caret, title, reorder/hide/close controls
    CardHeader.css
    CardHeader.test.jsx    # [TEST]
    CardHeader.stories.jsx # [STORY]
    Card.jsx               # Stateful display + inline editing + resize; composes CardHeader
    Card.css
    Card.test.jsx
    Card.stories.jsx
    cardStorage.js         # localStorage read/write (plain JS, no React)
    cardStorage.test.js
    useCards.js            # React hook over cardStorage
    useCards.test.js
    index.js               # Barrel exports
```

## Card data model

`createCard({ title = '', body = '' })` returns:

| Field       | Type   | Notes                          |
|-------------|--------|--------------------------------|
| `id`        | string | `crypto.randomUUID()`          |
| `type`      | string | Always `'text'` for now        |
| `title`     | string |                                |
| `body`      | string | Plain text; newlines preserved |
| `createdAt` | number | `Date.now()` at creation       |
| `updatedAt` | number | Updated by `updateCardFields`  |

`updateCardFields(card, { title, body })` returns a new card object with updated fields and a refreshed `updatedAt`. Fields default to the existing values so partial updates are safe.

```js
import { createCard, updateCardFields } from './card'

const card = createCard({ title: 'Notes', body: 'Buy milk' })
const updated = updateCardFields(card, { body: 'Buy oat milk' })
```

## CardHeader component

`CardHeader` is a dumb header strip rendered at the top of every card.

| Prop | Type | Description |
|---|---|---|
| `title` | string | Displayed as an `h3`; clickable with text cursor when `onTitleClick` is provided |
| `editing` | boolean | When `true`, replaces `h3` with a controlled `<input>` showing an underline |
| `onTitleChange` | function | Called with new string value on every keystroke in the title input |
| `inputRef` | ref | Forwarded to the title `<input>` so the parent can focus/select it |
| `onTitleClick` | function \| undefined | When provided, the `h3` becomes focusable (`tabIndex={0}`) and calls this on click or Enter/Space |
| `folded` | boolean | Controls caret rotation and `aria-label` on the fold button |
| `hidden` | boolean | Controls eye icon variant and `aria-label` on the hide button |
| `onToggleFold` | function \| undefined | If provided, renders the fold caret button on the left |
| `onToggleHide` | function \| undefined | If provided, renders the eye button in the right controls group |
| `onMoveUp` | function \| undefined | If provided, renders the up-arrow button |
| `onMoveDown` | function \| undefined | If provided, renders the down-arrow button |
| `onClose` | function \| undefined | If provided, renders the X close button (visually separated on the far right) |

Layout: `[fold-caret] [title or input] [up] [down] [eye] [X]`

- The fold caret sits to the left of the title, borderless, 50% opacity, full opacity on hover.
- Up/down arrows use a stemmed arrow SVG (shaft + arrowhead) to distinguish them visually from the fold caret (plain V chevron).
- The close X has a left border separator.
- All right-side controls are omitted entirely when the corresponding prop is `undefined` — a card with no callbacks renders no buttons at all.
- When `editing` is `true`, the title `h3` is replaced by a transparent `<input>` that is visually flush with the header (same size, same font, only an underline indicates the active field). The border-bottom space is always reserved on the `h3` so switching does not shift the header height.

Aria labels: **Collapse card / Expand card** (fold), **Dim card / Show card** (hide), **Move card up**, **Move card down**, **Remove card**.

## Card component

`Card` is a stateful component that composes `CardHeader` and manages inline editing and body resize.

| Prop | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Forwarded to `CardHeader`; shown as `h3` or `<input>` depending on edit state |
| `body` | string | — | Rendered as `<p>` (view) or `<textarea>` (edit); hidden when `foldState` is true |
| `foldState` | boolean | `false` | When true, body and resize handle are not rendered |
| `hiddenState` | boolean | `false` | Applies `.card--hidden` (`opacity: 0.38`); card remains in the DOM |
| `onToggleFold` | function | undefined | Forwarded to CardHeader fold caret |
| `onToggleHide` | function | undefined | Forwarded to CardHeader eye button |
| `onMoveUp` | function | undefined | Forwarded to CardHeader up arrow |
| `onMoveDown` | function | undefined | Forwarded to CardHeader down arrow |
| `onUpdate` | function | undefined | `({ title, body }) => void` — when provided, enables inline editing (title and body become clickable) |
| `onClose` | function | undefined | Forwarded to CardHeader X button |

### Inline editing

When `onUpdate` is provided:

- **Title click**: the `h3` is focusable; clicking it (or pressing Enter/Space) enters edit mode with the title input focused and all text pre-selected.
- **Body click**: the `<p>` has `role="button"` and `tabIndex={0}`; clicking it enters edit mode with the textarea focused.
- In edit mode, both title and body are simultaneously editable.
- **Commit**: focus leaving the `.card` div saves changes via `onUpdate`. Only called if at least one field changed.
- **Cancel**: Escape exits edit mode and restores the original values without saving.
- Visual continuity: the card does not shift size when entering or leaving edit mode. The title input is flush with the header (same font, same dimensions, underline only). The textarea is initialised to the exact pixel height of the `<p>` it replaces (measured from the DOM before re-render), then grows as the user types.

### Body resize

A drag handle (`<div role="separator" aria-label="Resize card">`) is rendered below the body area when the card is not folded.

- Dragging up shrinks the body area to a minimum of 40px (content scrolls within the constrained area).
- Dragging down past the natural content height snaps back to auto (unconstrained) height.
- Resize height is ephemeral — stored in component state, not persisted to localStorage.
- The textarea auto-grows to its content height as the user types regardless of the manual resize state.

```jsx
import { Card } from './card'

// Read-only
<Card title="Meeting notes" body="Discuss roadmap" />

// Full interactive
<Card
  title="Meeting notes"
  body="Discuss roadmap"
  foldState={false}
  hiddenState={false}
  onToggleFold={() => fold(id)}
  onToggleHide={() => hide(id)}
  onMoveUp={() => reorder(id, position - 1)}
  onMoveDown={() => reorder(id, position + 1)}
  onUpdate={(fields) => updateCard(id, fields)}
  onClose={() => removeCard(id)}
/>
```

## Storage

Backed by IndexedDB via Dexie. See [storage.md](./storage.md) for the database schema and test setup.

| Function | Behaviour |
|---|---|
| `getAllCards()` | Returns all card records from Dexie. |
| `putCard(card)` | Upserts a card record with `dirty: true` (for future sync). |
| `deleteCard(cardId)` | Deletes a card record by primary key. |

## React hook

`useCards()` returns:

| Property   | Type       | Description |
|------------|------------|-------------|
| `cards`    | `Card[]`   | Current list; starts `[]`, populated once the async `getAllCards()` call resolves on mount |
| `addCard`  | `function` | `async ({ title, body }) => card` — creates via `createCard`, calls `putCard`, appends to state |

Note: `useCards` is a lower-level hook used only by `CardShell`. Card mutation (update, remove, reorder) within a tab is owned by `useTabs`, which calls `cardStorage` directly.

## Styling notes

- Cards use warm parchment/espresso values in `Card.css` and `CardHeader.css` following the neo-brutalism brief.
- Hidden cards: `opacity: 0.38` via `.card--hidden`.
- Folded cards: body and resize handle are not rendered (no CSS trick; they're just absent from the DOM).
- `appearance: none; -webkit-appearance: none;` on both the title input and body textarea ensures text renders identically to the `h3`/`<p>` equivalents (no platform-native font-smoothing difference).

## Tests

| File | What it covers |
|------|----------------|
| `createCard.test.js` | Default fields, custom title/body, unique ids, `updateCardFields` partial and full update |
| `CardHeader.test.jsx` | Renders title; no buttons without callbacks; fold/hide/move/close callbacks called; correct aria-labels; title focusable when onTitleClick provided |
| `Card.test.jsx` | Renders title/body; line breaks preserved; foldState hides body and resize handle; hiddenState applies `.card--hidden`; resize handle present/absent; inline editing (click title enters edit mode with pre-selection, click body enters edit mode, commit on blur, cancel on Escape, no save if unchanged, body not clickable without onUpdate); move/close buttons forwarded |
| `cardStorage.test.js` | Empty load, save/reload round trip, corrupt data |
| `useCards.test.js` | Load on mount, add + persist, remount reload |

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Additional card types (process, portal, container)
- Rich text (Tiptap), embeds
- Per-card colour, tags, or metadata
- Dexie / Supabase persistence
- `user_id` / multi-user sync
