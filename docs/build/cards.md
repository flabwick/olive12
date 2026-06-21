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
    flipLogic.js                # Pure: toggle flip set, isFlipped
    flipLogic.test.js           # [TEST]
    CardBack.jsx                # Back face: notes, metadata, wiki index (library only)
    CardBack.css
    CardBack.test.jsx           # [TEST]
    CardBack.stories.jsx        # [STORY]
    LocationButton.jsx          # Dumb: save-to-shelf / move-to-library / in-library button
    LocationButton.css
    LocationButton.test.jsx     # [TEST]
    LocationButton.stories.jsx  # [STORY]
    FolderPickerOverlay.jsx     # Dumb: overlay shown when moving a shelf card to library
    FolderPickerOverlay.css
    FolderPickerOverlay.test.jsx # [TEST]
    FolderPickerOverlay.stories.jsx # [STORY]
    richTextLogic.js            # Pure: markdownToHtml, htmlToMarkdown, isEmptyMarkdown (embed-aware)
    richTextLogic.test.js       # [TEST]
    RichTextEditorContext.jsx   # React context: tracks active editor, cardId, editorSurface
    RichTextEditorContext.test.jsx # [TEST]
    RichTextEditor.jsx          # Tiptap editor wrapper: formatting toolbar, embed bar, EmbeddedCardNode
    RichTextEditor.css
    RichTextEditor.test.jsx     # [TEST]
    RichTextEditor.stories.jsx  # [STORY]
    EmbeddedCardNode.js         # Tiptap inline node for [[cardId]] embed tokens
    EmbedEntriesContext.jsx     # React context: vault card entries available to embed picker
    EmbedEntriesContext.test.jsx # [TEST]
    EmbedSourcePanel.jsx        # Dumb: searchable card picker for [[cardId]] embed insertion
    EmbedSourcePanel.css
    EmbedSourcePanel.test.jsx   # [TEST]
    EmbedSourcePanel.stories.jsx # [STORY]
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
| `back` | string | Freeform notes on the card back face; default `''` |
| `createdAt` | number | `Date.now()` at creation |
| `updatedAt` | number | Updated by `updateCardFields` |

`updateCardFields(card, { title, body, back, location, folderId, config })` — returns a new card with updated fields and a refreshed `updatedAt`. Unspecified fields keep their existing values.

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
| `onFlip` | function \| undefined | If provided, renders the flip button (≡ three-line icon) |
| `flipped` | boolean | When true, flip button gets active styling |
| `onClose` | function \| undefined | If provided, renders the X close button |

Layout: `[fold-caret] [title or input] [LocationButton] [up] [down] [eye] [flip] [X]`

Aria labels: **Collapse card / Expand card** (fold), **Dim card / Show card** (hide), **Move card up**, **Move card down**, **Show card back / Show card front** (flip — dynamic based on `flipped`), **Remove card**.

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

Stateful: manages `editing`, `draftTitle`. Composes `CardHeader` and `RichTextEditor`.

Key props: `cardId`, `title`, `body`, `back`, `foldState`, `hiddenState`, `location`, `folders`, `onToggleFold`, `onToggleHide`, `onMoveUp`, `onMoveDown`, `onUpdate`, `onClose`, `onSaveToShelf`, `onMoveToLibrary`, `editorSurface`.

**`editorSurface`** — `'tab'` (default) or `'dock'`. Forwarded to `RichTextEditor`, which forwards it to `RichTextEditorContext.registerEditor(cardId, editorSurface, editor)`. The dock state machine uses this to distinguish a dock-surface edit from a tab-surface edit, enabling the correct Dock state (DOCK_EDITOR vs TAB_EDITOR).

**Title editing:** Click title `h3` → enters edit mode with title input focused. Commit on blur or Enter. Escape cancels.

**Body editing:** The body is a `RichTextEditor` (Tiptap). Editing is active whenever `onUpdate` is provided and `editable` is true. Body changes are committed continuously via `onChange` (no explicit blur step). The `[[+]]` embed button appears in the editor's embed bar; clicking it opens `EmbedSourcePanel` inline; selecting a card inserts an `EmbeddedCardNode`.

**Flip:** When `flipped` is true, the front face (header + body) is hidden and `CardBack` is shown instead. Flip is toggled from `CardHeader` via `onFlip`; state lives in `useTabs` (`flippedCardIds` Set). See [brain.md](./brain.md) for wiki index on the back (library only).

## Rich text system

### richTextLogic.js

Pure serialization — no React, no storage.

| Function | Behaviour |
|---|---|
| `markdownToHtml(md)` | Parses markdown to HTML. A marked inline extension converts `[[cardId]]` tokens to `<span data-card-id="cardId">[[cardId]]</span>` before parsing. Returns `''` for blank input. |
| `htmlToMarkdown(html)` | Converts HTML to markdown via Turndown. A custom rule converts `<span data-card-id="...">` back to `[[cardId]]`. GFM strikethrough rule is also registered. |
| `isEmptyMarkdown(md)` | Returns `true` for blank/null/undefined content. |

The `[[cardId]]` round-trip requires non-empty span content because Turndown skips blank inline nodes before checking custom rules. The marked extension therefore renders the token text inside the span.

### RichTextEditorContext

`RichTextEditorProvider` / `useRichTextEditorContext()` — tracks the active Tiptap editor instance, the card it belongs to, and which surface it is on.

| Value | Type | Description |
|---|---|---|
| `activeEditor` | `Editor \| null` | The Tiptap editor that currently has focus |
| `activeCardId` | `string \| null` | The `cardId` of the focused editor |
| `activeSurface` | `'tab' \| 'dock' \| null` | Which surface the editor is on |
| `registerEditor(cardId, surface, editor)` | function | Called on focus — sets all three values |
| `clearEditor(cardId)` | function | Called on blur — clears only if the card id still matches (guards against focus/blur race) |

`RichTextEditorProvider` wraps `App` (outside `AppShell`) so that `AppShell` can read `activeCardId` and `activeSurface` to drive the dock state machine.

### RichTextEditor component

`RichTextEditor({ value, onChange, editable, ariaLabel, placeholder, cardId, editorSurface })` — Tiptap editor wrapper.

- Uses `StarterKit` + `EmbeddedCardNode` extensions.
- On focus: calls `registerEditor(cardId, editorSurface, editor)`.
- On blur: calls `clearEditor(cardId)`.
- `onChange(markdown)` fires on every Tiptap update via `htmlToMarkdown(editor.getHTML())`.
- Syncs external `value` changes when the editor is not focused (streaming support).
- **Formatting toolbar** (TOOLBAR_ITEMS): Bold, Italic, Strike, Code, H1/H2/H3, Bullet list, Ordered list, Blockquote, Undo, Redo — rendered by `Dock` when the editor is active.
- **Embed bar:** `[[+]]` button (aria: "Embed card") opens `EmbedSourcePanel` inline. Selecting a card inserts an `EmbeddedCardNode` at the cursor.

### EmbeddedCardNode

Tiptap `Node.create` extension (`src/card/EmbeddedCardNode.js`).

- `group: 'inline'`, `inline: true`, `atom: true` — renders as an indivisible inline badge.
- `addAttributes`: `cardId` — parsed from `data-card-id` attribute; rendered back to `data-card-id`.
- `parseHTML`: matches `span[data-card-id]`.
- `renderHTML`: outputs `<span data-card-id="..." class="embedded-card-node">[[cardId]]</span>`.

### EmbedEntriesContext

`EmbedEntriesProvider({ entries, children })` / `useEmbedEntries()` — provides the flat list of vault card entries (shelf + library) to any component in the tree without prop drilling.

`AppShell` wraps its content with `<EmbedEntriesProvider entries={[...shelfEntries, ...libraryEntries]}>`. `RichTextEditor` calls `useEmbedEntries()` to pass entries to `EmbedSourcePanel`.

### EmbedSourcePanel

`EmbedSourcePanel({ entries, onSelect, onClose })` — dumb searchable picker.

- `role="dialog" aria-label="Insert embed"`.
- Search input filters `entries` by card title (case-insensitive substring).
- Clicking a card button calls `onSelect(card.id)`.
- Cancel button calls `onClose`.
- Empty state: "No cards found."

## CardBack component

Back face rendered when a card is flipped. Props include `cardId`, `back`, `location`, `createdAt`, `updatedAt`, `indexEntry`, `indexLoading`, `onUpdateBack`.

| Section | When shown |
|---|---|
| Notes | Always — editable textarea when `onUpdateBack` provided |
| Metadata | Created / updated timestamps |
| Index | Only when `location === 'library'` — title, summary, tags from `indexEntry`; spinner when `indexLoading` |
| Index debug | Collapsible `<details>` with pipeline state (see [debug.md](./debug.md)) |

Portal cards pass the **target** card's location and index fields (resolved in `useTabs` / `Tab.jsx`).

## flipLogic.js

Pure helpers. No React, no side effects.

| Function | Behaviour |
|---|---|
| `canFlip(card)` | `true` when `type === 'text'` and `back` is non-empty after trim |
| `toggleFlip(flippedSet, cardId)` | Returns a **new** `Set` with `cardId` added if absent, removed if present. Does not mutate the input. |
| `isFlipped(flippedSet, cardId)` | Returns `boolean` — whether `cardId` is in `flippedSet`. |

Flip state lives in `useTabs` as `flippedCardIds` (a `Set<string>`). `flipCard(cardId)` uses `toggleFlip` to produce a new set; `isFlippedCard(cardId)` uses `isFlipped` to read it. The flip button renders whenever `onFlip` is passed to `CardHeader`, unconditionally — `canFlip` is not consulted.

## PortalCard component

`PortalCard` is a thin wrapper around `Card`. It resolves the portal target and delegates all rendering to `Card`, so portal cards are visually identical to text cards.

Props: `config`, `cardsById`, `foldState`, `hiddenState`, `location`, `folders`, `flipped`, `indexEntry`, `indexLoading`, `onToggleFold`, `onToggleHide`, `onMoveUp`, `onMoveDown`, `onClose`, `onUpdate`, `onUpdateBack`, `onFlip`, `onLocate`.

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
| `flipLogic.test.js` | `canFlip` for text/portal/empty back; `toggleFlip` adds/removes/non-mutating; `isFlipped` true/false/empty |
| `CardBack.test.jsx` | Notes render; index section library-only; loading state; debug details |
| `richTextLogic.test.js` | `markdownToHtml`: bold/italic/heading/list/empty; embed token `[[cardId]]` → span with data-card-id. `htmlToMarkdown`: strong/em/h1/del; span[data-card-id] → `[[cardId]]`; embed roundtrip. `isEmptyMarkdown` variants. |
| `RichTextEditorContext.test.jsx` | registerEditor sets active state; clearEditor clears only when cardId matches; blur race condition guard |
| `RichTextEditor.test.jsx` | Renders without crashing; markdown value renders; bold markdown; aria-label; onChange prop; embedded-card-node renders for [[cardId]] value |
| `EmbedEntriesContext.test.jsx` | useEmbedEntries returns [] by default; returns provided entries |
| `EmbedSourcePanel.test.jsx` | Search input; renders entry buttons; filter by title; no-match state; onSelect called with cardId; onClose called; dialog label; empty state |

## Not built yet

- Process and container card types
- EmbeddedCardNode showing card title (currently shows `[[cardId]]`; needs NodeView + cardsById access)
- Per-card colour or tags on front face (index tags are on back only)
- Card deletion sync to Supabase
- `user_id` on local card records
- Portal → portal chaining (portal targeting another portal)
