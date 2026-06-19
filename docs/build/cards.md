# Cards — implementation

Text and portal card data shapes, pure logic, storage, React hook, and display components.

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
    portalLogic.js              # Pure: isPortalCard, resolvePortalTarget
    portalLogic.test.js         # [TEST]
    CardHeader.jsx              # Dumb header strip: fold caret, title, location button, controls
    CardHeader.css
    CardHeader.test.jsx         # [TEST]
    CardHeader.stories.jsx      # [STORY]
    Card.jsx                    # Stateful: inline editing + body resize; composes CardHeader
    Card.css
    Card.test.jsx               # [TEST]
    Card.stories.jsx            # [STORY]
    PortalCard.jsx              # Thin wrapper around Card; resolves portal target, adds locate button
    PortalCard.css
    PortalCard.test.jsx         # [TEST]
    PortalCard.stories.jsx      # [STORY]
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

`createCard({ title = '', body = '', type = 'text', config = null })` returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `type` | string | `'text'` or `'portal'` |
| `title` | string | Empty string for portal cards (content comes from target) |
| `body` | string | Plain text; empty string for portal cards |
| `config` | object \| null | `null` for text cards; `{ target_card_id: string \| null }` for portal cards |
| `location` | string | `'none' \| 'shelf' \| 'library'`; default `'none'` |
| `folderId` | string \| null | Library folder id; `null` for root-level or unplaced |
| `createdAt` | number | `Date.now()` at creation |
| `updatedAt` | number | Updated by `updateCardFields` |

`updateCardFields(card, { title, body, location, folderId, config })` — returns a new card with updated fields and a refreshed `updatedAt`. Unspecified fields keep their existing values.

**`location` semantics:**
- `'none'` — card lives in its tab; not committed to the vault.
- `'shelf'` — saved to Shelf (chronological staging area).
- `'library'` — promoted to Library (organised, folder-based).

**`type` semantics:**
- `'text'` — standard editable card with `title` and `body`.
- `'portal'` — proxy card that reads `title`/`body` from a target card. Own `title`/`body` are empty strings. `config.target_card_id` holds the target card's id (or `null` if not yet linked).

## Portal logic — portalLogic.js

Pure functions, no React, no storage.

### `isPortalCard(card)` → boolean

Returns `true` if `card?.type === 'portal'`.

### `resolvePortalTarget(portalCard, cardsById)` → Card | null

Looks up the target card from a `cardsById` map. Returns `null` if:
- `portalCard` is null/undefined
- `config` is null/undefined
- `target_card_id` is null/falsy
- the target id is not a key in `cardsById`

## Card storage

`src/card/cardStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllCards()` | Returns all records from the `cards` Dexie table |
| `putCard(card)` | Upserts the card with `dirty: true` — marks it for Supabase sync |
| `deleteCard(cardId)` | Deletes the record by primary key |
| `getDirtyCards()` | Returns all records where `dirty === true` |
| `markCardClean(cardId, mergedCard)` | Upserts `mergedCard` with `dirty: false`; called only by the sync layer |

Both text and portal cards go through `putCard` and are flagged dirty for sync.

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

## PortalCard component

`PortalCard` is a thin wrapper around `Card`. It resolves the portal target and delegates all rendering to `Card`, so portal cards are visually identical to text cards.

Props: `config`, `cardsById`, `foldState`, `hiddenState`, `location`, `folders`, `onToggleFold`, `onToggleHide`, `onMoveUp`, `onMoveDown`, `onClose`, `onUpdate`, `onLocate`.

**Resolution:** `resolvePortalTarget` is called with `{ config }` and `cardsById`. When the target exists, `Card` receives the target's `title` and `body`. When the target is absent (null target_card_id, or id not found in `cardsById`), `Card` renders `title="Portal — no target"` and `body="No card linked."`.

**Editing:** `onUpdate` is forwarded to `Card` only when the target exists. Edits go to the target card's id (bound by the caller — `Tab.jsx`), so changes sync through the normal `updateCard` path and propagate to every other portal pointing at the same card.

**Locate button:** When both `target` and `onLocate` are provided, a small circular button (aria: "Show in vault", ✓ checkmark SVG) is rendered as an absolute overlay in the bottom-right of the card. Clicking it calls `onLocate()`. The button is hidden when the target is null.

The `.portal-card` wrapper has `position: relative`; the `.portal-card__locate` button is `position: absolute; bottom: 0.3125rem; right: 0.4375rem`. Default opacity 0.6; full opacity on hover.

## Tests

| File | What it covers |
|---|---|
| `createCard.test.js` | Default fields (type/config/location/folderId); custom title/body; unique ids; `updateCardFields` partial/full update including config passthrough; portal card creation (type='portal', config shape) |
| `cardStorage.test.js` | Empty load; `putCard` round-trip; `dirty: true`; upsert; `deleteCard`; `location` round-trip; `getDirtyCards`; `markCardClean`; portal card config round-trip |
| `useCards.test.js` | Load on mount, add + persist, remount reload |
| `portalLogic.test.js` | `isPortalCard` true/false/null/undefined; `resolvePortalTarget` found/null-targetId/not-in-map/null-config/null-portalCard/empty-cardsById |
| `CardHeader.test.jsx` | Renders title; no buttons without callbacks; fold/hide/move/close callbacks; aria-labels; title focusable when onTitleClick provided |
| `LocationButton.test.jsx` | Save to Shelf button for location=none; shelf button + overlay toggle for location=shelf; disabled in-library button; no button when no callbacks |
| `FolderPickerOverlay.test.jsx` | Renders folder list; root option; onSelect called with folderId; onDismiss called |
| `Card.test.jsx` | Renders title/body; fold hides body and resize handle; hidden applies `.card--hidden`; resize handle present/absent; inline editing (click title, click body, commit on blur, cancel on Escape, no save if unchanged) |
| `PortalCard.test.jsx` | Renders target title/body when resolved; placeholder when target null; placeholder when cardsById missing target; fold hides body; hiddenState applies card--hidden; onClose/onMoveUp/onMoveDown callbacks; onUpdate called with edited fields (committed on blur); null target not editable; Show in vault button present/absent (requires both target and onLocate); calls onLocate on click |

## Not built yet

- Process and container card types
- Rich text (Tiptap), embeds
- Per-card colour, tags, or metadata
- Card deletion sync to Supabase
- `user_id` on local card records
- Portal → portal chaining (portal targeting another portal)
