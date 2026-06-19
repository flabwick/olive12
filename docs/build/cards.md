# Cards — implementation

Text card data shape, pure logic, storage, React hook, and display components.

## File map

```
src/
  card/
    createCard.js               # Card factory + updateCardFields (pure, no React)
    createCard.test.js          # [TEST]
    cardStorage.js              # Dexie-backed per-record operations (pure, no React)
    cardStorage.test.js         # [TEST]
    useCards.js                 # Thin React hook over cardStorage (used by CardShell only)
    useCards.test.js            # [TEST]
    CardHeader.jsx              # Dumb header strip: fold caret, title, location button, controls
    CardHeader.css
    CardHeader.test.jsx         # [TEST]
    CardHeader.stories.jsx      # [STORY]
    Card.jsx                    # Stateful: inline editing + body resize; composes CardHeader
    Card.css
    Card.test.jsx               # [TEST]
    Card.stories.jsx            # [STORY]
    LocationButton.jsx          # Dumb: save-to-shelf / move-to-library / in-library button
    LocationButton.css
    LocationButton.test.jsx     # [TEST]
    LocationButton.stories.jsx  # [STORY]
    FolderPickerOverlay.jsx     # Dumb: overlay shown when moving a shelf card to library
    FolderPickerOverlay.css
    FolderPickerOverlay.test.jsx # [TEST]
    FolderPickerOverlay.stories.jsx # [STORY]
    index.js                    # Barrel exports
```

## Data model

`createCard({ title = '', body = '' })` returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `type` | string | Always `'text'` |
| `title` | string | |
| `body` | string | Plain text; newlines preserved |
| `location` | string | `'none' \| 'shelf' \| 'library'`; default `'none'` |
| `folderId` | string \| null | Library folder id; `null` for root-level or unplaced |
| `createdAt` | number | `Date.now()` at creation |
| `updatedAt` | number | Updated by `updateCardFields` |

`updateCardFields(card, { title, body, location, folderId })` — returns a new card with updated fields and a refreshed `updatedAt`. Unspecified fields keep their existing values.

**`location` semantics:**
- `'none'` — card lives in its tab; not committed to the vault.
- `'shelf'` — saved to Shelf (chronological staging area).
- `'library'` — promoted to Library (organised, folder-based).

## Card storage

`src/card/cardStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllCards()` | Returns all records from the `cards` Dexie table |
| `putCard(card)` | Upserts the card with `dirty: true` — marks it for Supabase sync |
| `deleteCard(cardId)` | Deletes the record by primary key |
| `getDirtyCards()` | Returns all records where `dirty === true` |
| `markCardClean(cardId, mergedCard)` | Upserts `mergedCard` with `dirty: false`; called only by the sync layer |

## CardHeader component

Dumb header strip at the top of every card. Props:

| Prop | Type | Description |
|---|---|---|
| `title` | string | Displayed as `h3`; replaced by `<input>` when `editing` is true |
| `editing` | boolean | Switches title to a transparent input with underline |
| `onTitleChange` | function | Called on every keystroke in the title input |
| `inputRef` | ref | Forwarded to the title `<input>` |
| `onTitleClick` | function \| undefined | If provided, `h3` is focusable and calls this on click/Enter/Space |
| `folded` | boolean | Controls caret rotation and fold button aria-label |
| `hidden` | boolean | Controls eye icon variant |
| `location` | string | Passed to `LocationButton` |
| `folders` | array | Passed to `LocationButton` for the folder picker |
| `onSaveToShelf` | function \| undefined | Forwarded to `LocationButton` |
| `onMoveToLibrary` | function \| undefined | Forwarded to `LocationButton` |
| `onToggleFold` | function \| undefined | If provided, renders the fold caret button |
| `onToggleHide` | function \| undefined | If provided, renders the eye button |
| `onMoveUp` | function \| undefined | If provided, renders the up-arrow button |
| `onMoveDown` | function \| undefined | If provided, renders the down-arrow button |
| `onClose` | function \| undefined | If provided, renders the X close button |

Layout: `[fold-caret] [title or input] [LocationButton] [up] [down] [eye] [X]`

Aria labels: **Collapse card / Expand card** (fold), **Dim card / Show card** (hide), **Move card up**, **Move card down**, **Remove card**.

## LocationButton component

Renders the save/promote button in the card header. Owned by `CardHeader`, not by `Card` directly. Three states:

| `location` | Rendered | Action |
|---|---|---|
| `'none'` | `+` button (aria: "Save to Shelf") | Calls `onSaveToShelf` |
| `'shelf'` | `✓` button (aria: "Saved to Shelf — click to move to Library") | Opens `FolderPickerOverlay` |
| `'library'` | `✓` button, disabled (aria: "In Library") | No action |

## FolderPickerOverlay component

Overlay shown when a shelf card is being moved to the Library. Opens when the `✓` shelf button is clicked inside `LocationButton`. Props: `folders`, `onSelect(folderId)`, `onDismiss`. Renders a list of folders plus a "No folder (root)" option.

## Card component

Stateful: manages `editing`, `draftTitle`, `draftBody`, and `bodyHeight`. Composes `CardHeader`.

Key props: `title`, `body`, `foldState`, `hiddenState`, `location`, `folders`, `onToggleFold`, `onToggleHide`, `onMoveUp`, `onMoveDown`, `onUpdate`, `onClose`, `onSaveToShelf`, `onMoveToLibrary`.

**Inline editing:** Enabled when `onUpdate` is provided.
- Click title `h3` → enters edit mode with title input focused, all text selected.
- Click body `<p>` → enters edit mode with textarea focused.
- Both title and body are simultaneously editable in edit mode.
- Commit on blur away from the `.card` div; calls `onUpdate` only if content changed.
- Escape cancels and restores original values.
- Visual continuity: card does not shift size when entering/leaving edit mode.

**Body resize:** A drag handle (`role="separator" aria-label="Resize card"`) sits below the body. Dragging up shrinks to a minimum of 40px; dragging down past the content height snaps back to auto. Resize height is ephemeral — not persisted.

**Body auto-resize in edit mode:** The textarea grows with content using `scrollHeight`.

## Tests

| File | What it covers |
|---|---|
| `createCard.test.js` | Default fields, custom title/body, unique ids, `folderId` null, `updateCardFields` partial/full update |
| `cardStorage.test.js` | Empty load, `putCard` round-trip, `dirty: true` assertion, upsert, `deleteCard`, `location` round-trip, `getDirtyCards`, `markCardClean` |
| `useCards.test.js` | Load on mount, add + persist, remount reload |
| `CardHeader.test.jsx` | Renders title; no buttons without callbacks; fold/hide/move/close callbacks; aria-labels; title focusable when onTitleClick provided |
| `LocationButton.test.jsx` | Save to Shelf button for location=none; shelf button + overlay toggle for location=shelf; disabled in-library button; no button when no callbacks |
| `FolderPickerOverlay.test.jsx` | Renders folder list; root option; onSelect called with folderId; onDismiss called |
| `Card.test.jsx` | Renders title/body; fold hides body and resize handle; hidden applies `.card--hidden`; resize handle present/absent; inline editing (click title, click body, commit on blur, cancel on Escape, no save if unchanged) |

## Not built yet

- Additional card types (process, portal, container)
- Rich text (Tiptap), embeds
- Per-card colour, tags, or metadata
- Card deletion sync to Supabase
- `user_id` on local card records
