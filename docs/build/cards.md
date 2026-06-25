# Cards — implementation

Text, portal, and file card data shapes, pure logic, storage, React hook, and display components.

## File map

```
src/
  card/
    createCard.js               # Card factory + updateCardFields (pure, no React)
    createCard.test.js          # [TEST]
    createFileCard.js           # File card factory + fileTypeLabel + formatFileSize (pure, no React)
    createFileCard.test.js      # [TEST]
    cardStorage.js              # Dexie-backed per-record operations (pure, no React)
    cardStorage.test.js         # [TEST]
    useCards.js                 # Thin React hook over cardStorage (used by CardShell only)
    useCards.test.js            # [TEST]
    portalLogic.js              # Pure: isPortalCard, resolvePortalTarget
    portalLogic.test.js         # [TEST]
    CardHeader.jsx              # Dumb header strip: fold caret, title, right-side controls
    CardHeader.css
    CardHeader.test.jsx         # [TEST]
    CardHeader.stories.jsx      # [STORY]
    Card.jsx                    # Stateful: inline editing + body resize; composes CardHeader
    Card.css
    Card.test.jsx               # [TEST]
    Card.stories.jsx            # [STORY]
    FileCard.jsx                # Stateful: inline title editing, read-only file body; composes CardHeader
    FileCard.css
    FileCard.test.jsx           # [TEST]
    FileCard.stories.jsx        # [STORY]
    PortalCard.jsx              # Thin wrapper around Card (or FileCard); resolves portal target
    PortalCard.css
    PortalCard.test.jsx         # [TEST]
    PortalCard.stories.jsx      # [STORY]
    flipLogic.js                # Pure: toggle flip set, isFlipped
    flipLogic.test.js           # [TEST]
    CardBack.jsx                # Back face: notes, metadata, wiki index (library only)
    CardBack.css
    CardBack.test.jsx           # [TEST]
    CardBack.stories.jsx        # [STORY]
    LocationButton.jsx          # (legacy) save-to-shelf / move-to-library button — not used by Card
    LocationButton.css
    LocationButton.test.jsx     # [TEST]
    LocationButton.stories.jsx  # [STORY]
    FolderPickerOverlay.jsx     # (legacy) overlay for shelf→library promotion
    FolderPickerOverlay.css
    FolderPickerOverlay.test.jsx # [TEST]
    FolderPickerOverlay.stories.jsx # [STORY]
    richTextLogic.js            # Pure: markdownToHtml, htmlToMarkdown, isEmptyMarkdown (embed-aware)
    richTextLogic.test.js       # [TEST]
    RichTextEditorContext.jsx   # React context: tracks active editor, cardId, editorSurface
    RichTextEditor.jsx          # Tiptap editor wrapper: extensions, streaming sync
    RichTextEditor.css
    RichTextEditor.test.jsx     # [TEST]
    RichTextEditor.stories.jsx  # [STORY]
    EmbeddedCardNode.js         # Tiptap Node extension for [[cardId]] — renders EmbeddedCardView
    EmbeddedCardView.jsx        # React NodeView: full CardHeader + editable body + resize
    EmbeddedCardView.css
    EmbedEntriesContext.jsx     # React context: vault card entries + action callbacks for embedded views
    EmbedSourcePanel.jsx        # Dumb: searchable card picker for [[cardId]] embed insertion
    EmbedSourcePanel.css
    EmbedSourcePanel.test.jsx   # [TEST]
    EmbedSourcePanel.stories.jsx # [STORY]
    useBodyResize.js            # Hook: pointer-drag resize for card body area
    useBodyResize.test.js       # [TEST]
    linkLogic.js                # Pure: extractLinks, diffLinks, isOrphan
    linkLogic.test.js           # [TEST]
    linkStorage.js              # Dexie CRUD + rebuildLinksForCard
    linkStorage.test.js         # [TEST]
    index.js                    # Barrel exports
```

## Data model

### Text and portal cards

`createCard({ title = '', body = '', type = 'text', config = null })` returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `type` | string | `'text'` or `'portal'` |
| `title` | string | Empty string for portal cards |
| `body` | string | Markdown; empty string for portal cards |
| `config` | object \| null | `null` for text cards; `{ target_card_id: string \| null }` for portal cards |
| `location` | string | `'none' \| 'shelf' \| 'library'`; default `'none'` |
| `folderId` | string \| null | Library folder id; `null` for root-level or unplaced |
| `back` | string | Freeform notes on card back face; default `''` |
| `createdAt` | number | `Date.now()` at creation |
| `updatedAt` | number | Updated by `updateCardFields` |

`updateCardFields(card, { title, body, back, location, folderId, config })` — returns a new card with updated fields and refreshed `updatedAt`. Unspecified fields keep their existing values.

### File cards

`createFileCard(file)` — `file` is a `File` object (from a file input). Returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `type` | string | `'file'` |
| `title` | string | `file.name` |
| `fileName` | string | `file.name` |
| `fileType` | string | `file.type` or `''` if empty |
| `fileSize` | number | `file.size` (bytes) |
| `body` | string | Always `''` |
| `back` | string | Always `''` |
| `config` | null | Always `null` |
| `location` | string | `'none'` (callers set `'library'` after creation for uploads) |
| `folderId` | string \| null | `null` at creation |
| `createdAt` | number | `Date.now()` |
| `updatedAt` | number | Same as `createdAt` at creation |

**`fileTypeLabel(fileType, fileName) → string`** — maps MIME types to short labels (PDF, PNG, JPG, XLSX, etc.). Falls back to the file extension uppercased. Returns `'FILE'` if neither is available.

**`formatFileSize(bytes) → string`** — formats bytes as `B`, `KB`, or `MB` with one decimal place.

**`type` semantics (all three types):**
- `'text'` — standard editable card.
- `'portal'` — proxy card reading `title`/`body` from a target card.
- `'file'` — metadata-only card representing an uploaded file. `body` and `back` are always empty; title is editable.

**`location` semantics:**
- `'none'` — card lives in its tab; not committed to the vault.
- `'shelf'` — saved to Shelf (chronological staging area).
- `'library'` — promoted to Library (organised, folder-based).

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

All three card types go through `putCard` and are flagged dirty for sync.

## CardHeader component

Dumb header strip at the top of every card. Layout: `[fold-caret] [title or input] [controls]`.

Props:

| Prop | Type | Description |
|---|---|---|
| `title` | string | Displayed as `h3`; replaced by `<input>` when `editing` is true |
| `editing` | boolean | Switches title to a transparent input with underline |
| `onTitleChange` | function | Called on every keystroke in the title input |
| `onTitleBlur` | function \| undefined | Called on title input blur (for embedded card views) |
| `onTitleKeyDown` | function \| undefined | Called on keydown in title input (for embedded card views) |
| `inputRef` | ref | Forwarded to the title `<input>` |
| `onTitleClick` | function \| undefined | If provided, `h3` is focusable and calls this on click/Enter/Space |
| `folded` | boolean | Controls caret rotation and fold button aria-label |
| `hidden` | boolean | Controls eye icon variant |
| `location` | string | Used to determine whether the save button shows active/inactive state |
| `onSaveToShelf` | function \| undefined | If provided, renders save bookmark icon. `SaveIcon` when `location === 'none'`; `CheckIcon` (disabled) when already saved |
| `onToggleFold` | function \| undefined | If provided, renders the fold caret button |
| `onToggleHide` | function \| undefined | If provided, renders the eye button |
| `onSendToDock` | function \| undefined | If provided, renders the send-to-dock arrow button |
| `onSendToTab` | function \| undefined | If provided, renders the send-to-tab arrow button |
| `onClose` | function \| undefined | If provided, renders the X close button |

**Removed from CardHeader:** `onMoveUp`, `onMoveDown`, `onFlip`, `flipped`, `folders`. Flip is absent from the front face — `CardBack` has the flip-to-front button.

## Card component

Stateful: manages `editing`, draft title/body/back. Composes `CardHeader` and `RichTextEditor`.

Key props: `cardId`, `title`, `body`, `back`, `flipped`, `foldState`, `hiddenState`, `location`, `onToggleFold`, `onToggleHide`, `onSendToDock`, `onSendToTab`, `onUpdate`, `onClose`, `onSaveToShelf`, `onFlip`, `indexEntry`, `indexLoading`, `editorSurface`.

**`editorSurface`** — `'tab'` (default) or `'dock'`. Forwarded to `RichTextEditor`, which registers it in `RichTextEditorContext` so the dock state machine can distinguish surfaces.

**Title editing:** Click title `h3` (when `onUpdate` provided and not flipped) → enters edit mode. Commit on blur (checked against `relatedTarget`). Escape cancels.

**Body editing:** Click body area → enters edit mode. `RichTextEditor` becomes editable. Commit on blur.

**Back editing (when flipped):** Click inside back face → enters edit mode on the back field. Commit on blur.

**`flushAndThen(action)`** — commits any pending edit before `onSendToDock`/`onSendToTab` moves the card.

**`useBodyResize`** hook — drag handle at the bottom of the body area.

## FileCard component

Stateful: manages inline title editing only. Body is read-only.

Props: `title`, `fileName`, `fileType`, `fileSize`, `cardId`, `location`, `foldState`, `hiddenState`, `onToggleFold`, `onToggleHide`, `onClose`, `onUpdate`, `onSaveToShelf`, `onSendToDock`, `onSendToTab`.

- Composes `CardHeader` (editable title via `onTitleClick`).
- Body area: `FileDocIcon` + file name + type badge (from `fileTypeLabel`) + size (from `formatFileSize`). Body hidden when `foldState` is true.
- Title editing: click title → edit mode; commit on blur/Enter; Escape cancels.
- `onUpdate` provided → title is clickable. `onUpdate` absent → read-only.
- `hiddenState` adds `.file-card--hidden`.

**FileCard stories (8):** `PDF`, `Image`, `Spreadsheet`, `TextFile`, `UnknownType`, `Folded`, `Hidden`, `ReadOnly`.

## Rich text system

### richTextLogic.js

Pure serialization — no React, no storage.

| Function | Behaviour |
|---|---|
| `markdownToHtml(md)` | Parses markdown to HTML. A marked inline extension converts `[[cardId]]` tokens to `<span data-card-id="cardId">[[cardId]]</span>`. Returns `''` for blank input. |
| `htmlToMarkdown(html)` | Converts HTML to markdown via Turndown. Custom rule converts `<span data-card-id="...">` back to `[[cardId]]`. GFM strikethrough rule registered. |
| `isEmptyMarkdown(md)` | Returns `true` for blank/null/undefined content. |

### RichTextEditorContext

`RichTextEditorProvider` / `useRichTextEditorContext()` — tracks the active Tiptap editor instance, the card it belongs to, and which surface it is on.

| Value | Type | Description |
|---|---|---|
| `activeEditor` | `Editor \| null` | The Tiptap editor that currently has focus |
| `activeCardId` | `string \| null` | The `cardId` of the focused editor |
| `activeSurface` | `'tab' \| 'dock' \| null` | Which surface the editor is on |
| `registerEditor(cardId, surface, editor)` | function | Called on focus — sets all three values |
| `clearEditor(cardId)` | function | Called on blur — clears only if the card id still matches |

`RichTextEditorProvider` wraps `App` so that `AppShell` can read `activeCardId` and `activeSurface` to drive the dock state machine.

### RichTextEditor component

`RichTextEditor({ value, onChange, editable, ariaLabel, placeholder, cardId, editorSurface })` — Tiptap editor wrapper.

- Extensions: `StarterKit`, `EmbeddedCardNode`, `Highlight`, `TaskList`, `TaskItem`.
- On focus: calls `registerEditor(cardId, editorSurface, editor)`.
- On blur: calls `clearEditor(cardId)`.
- `onChange(markdown)` fires on every Tiptap update via `htmlToMarkdown(editor.getHTML())`.
- Syncs external `value` changes when the editor is not focused (streaming support for dock-prompt).

### EmbeddedCardNode and EmbeddedCardView

`EmbeddedCardNode` (`src/card/EmbeddedCardNode.js`) is a Tiptap `Node.create` extension.

- `group: 'inline'`, `inline: true`, `atom: true`.
- `addAttributes`: `cardId` — parsed from `data-card-id`, rendered back to `data-card-id`.
- `parseHTML`: matches `span[data-card-id]`.
- `renderHTML`: outputs `<span data-card-id="..." class="embedded-card-node">[[cardId]]</span>`.
- `addNodeView()`: renders `EmbeddedCardView` React component via `ReactNodeViewRenderer`. `stopEvent: () => true` for non-drag events.

`EmbeddedCardView` (`src/card/EmbeddedCardView.jsx`) — React display for embedded cards inside the editor.

- Reads card data from `useEmbedEntries()`.
- Reads action callbacks from `useEmbedActions()`: `onSaveToShelf`, `onMoveToDock`, `onUpdate`.
- Full `CardHeader` with fold, save, send-to-dock, and close (deletes node) buttons.
- Body: rendered as HTML from `markdownToHtml(card.body)`. Click to enter edit mode (plain `textarea`).
- Title: click to enter edit mode. Commit on blur/Enter; Escape cancels.
- Drag-to-resize handle (via `useBodyResize`).
- Falls back to `[[cardId]]` badge when card is not found in entries.

### EmbedEntriesContext and EmbedActionsContext

Two separate contexts in `src/card/EmbedEntriesContext.jsx`:

**`EmbedEntriesProvider({ entries, children })` / `useEmbedEntries()`** — provides all cards as a flat list to embedded card views.

**`EmbedActionsProvider({ onSaveToShelf, onMoveToDock, onMoveToTab, onUpdate, children })` / `useEmbedActions()`** — provides action callbacks to `EmbeddedCardView` without prop drilling.

### EmbedSourcePanel

`EmbedSourcePanel({ entries, onSelect, onClose, onCreateNew })` — dumb searchable picker.

- `role="dialog" aria-label="Insert embed"`.
- Filters `entries` by card title (case-insensitive substring).
- `onSelect(card.id)` on card click.
- `onCreateNew` — creates a new empty card and inserts it immediately.

## CardBack component

Back face rendered when a card is flipped.

Props: `cardId`, `back`, `location`, `createdAt`, `updatedAt`, `indexEntry`, `indexLoading`, `onUpdateBack`, `onFlip`, `editing`, `onBackChange`.

| Section | When shown |
|---|---|
| Flip-to-front button | Always — calls `onFlip` |
| Notes | Always — editable textarea when `editing` is true |
| Metadata | Created / updated timestamps |
| Index | Only when `location === 'library'` — title, summary, tags from `indexEntry`; spinner when `indexLoading` |
| Index debug | Collapsible `<details>` with pipeline state |

## flipLogic.js

Pure helpers. No React, no side effects.

| Function | Behaviour |
|---|---|
| `canFlip(card)` | `true` when `type === 'text'` and `back` is non-empty after trim |
| `toggleFlip(flippedSet, cardId)` | Returns a new `Set` with `cardId` added if absent, removed if present. Does not mutate input. |
| `isFlipped(flippedSet, cardId)` | Returns `boolean` — whether `cardId` is in `flippedSet`. |

Flip state lives in `useTabs` as `flippedCardIds`. The flip button has been removed from `CardHeader` — flipping happens only from `CardBack`'s "Flip to front" button or from `Tab`-level `flipCard` prop.

## PortalCard component

Thin wrapper around `Card` (or `FileCard` when target is a file card). Resolves the portal target and delegates all rendering.

Props: `config`, `cardsById`, `foldState`, `hiddenState`, `location`, `flipped`, `indexEntry`, `indexLoading`, `onToggleFold`, `onToggleHide`, `onFlip`, `onMoveUp`, `onMoveDown`, `onClose`, `onUpdate`, `onLocate`.

**No `onSaveToShelf`** — portal cards cannot be saved directly.

**Resolution:** When the target is a file card, renders `FileCard` with the target's file props. When the target is a text/portal card, renders `Card` with the target's `title` and `body`. When target is absent, renders `Card` with `title="Portal — no target"`.

**Locate button:** When both `target` and `onLocate` are provided, renders a small circular `aria-label="Show in vault"` overlay button.

## Tests

| File | What it covers |
|---|---|
| `createCard.test.js` | Default fields; custom title/body; unique ids; `updateCardFields` partial/full update; portal card creation |
| `createFileCard.test.js` | Default fields from File object; `type: 'file'`; `fileTypeLabel` (MIME match, extension fallback, FILE default); `formatFileSize` (B/KB/MB, null/zero/negative) |
| `cardStorage.test.js` | Empty load; `putCard` round-trip; `dirty: true`; upsert; `deleteCard`; `location` round-trip; `getDirtyCards`; `markCardClean`; portal card config round-trip |
| `useCards.test.js` | Load on mount, add + persist, remount reload |
| `portalLogic.test.js` | `isPortalCard` true/false/null/undefined; `resolvePortalTarget` found/null-targetId/not-in-map/null-config/null-portalCard/empty-cardsById |
| `CardHeader.test.jsx` | Renders title; no buttons without callbacks; fold/hide/save/sendToDock/sendToTab/close callbacks; aria-labels; title focusable when onTitleClick provided; save icon states; confirms no move-up/move-down/flip buttons |
| `Card.test.jsx` | Renders title/body; fold hides body and resize handle; hidden applies `.card--hidden`; inline editing (click title, click body, commit on blur, cancel on Escape); flip: CardBack renders when flipped, card--flipped class, back edit; location: Save card button |
| `FileCard.test.jsx` | Renders title, fileName, type badge, size; fold hides body; hidden class; title editing (click, commit, cancel); read-only when onUpdate absent; onSaveToShelf / onSendToDock / onClose callbacks |
| `PortalCard.test.jsx` | Renders target title/body; FileCard rendered for file target; placeholder when target null; fold hides body; hiddenState; onClose; onUpdate routes to target id; null target not editable; Show in vault button present/absent/calls onLocate |
| `flipLogic.test.js` | `canFlip` for text/portal/empty back; `toggleFlip` adds/removes/non-mutating; `isFlipped` true/false/empty |
| `CardBack.test.jsx` | Notes render; index section library-only; loading state; debug details |
| `richTextLogic.test.js` | `markdownToHtml` bold/italic/heading/list/empty/embed token; `htmlToMarkdown` strong/em/h1/del/span[data-card-id]; embed roundtrip; `isEmptyMarkdown` variants |
| `RichTextEditor.test.jsx` | Renders without crashing; markdown value renders; bold markdown; aria-label; onChange; embedded-card-node renders for [[cardId]] value |
| `EmbedSourcePanel.test.jsx` | Search input; entry buttons; filter by title; no-match state; onSelect; onClose; dialog label; empty state |
| `useBodyResize.test.js` | Resize behavior via pointer events |
| `linkLogic.test.js` | `extractLinks`; `diffLinks`; `isOrphan` |
| `linkStorage.test.js` | Round-trip; multiple sources; upsert dedup; `getLinksForTarget`; `deleteLinksForSource`; `rebuildLinksForCard` |

## Not built yet

- Process and container card types
- Per-card colour or tags on front face
- File card actual content storage or blob linking (only metadata is stored; no upload target)
- File card preview (image thumbnails, PDF inline viewer)
- File card download action
- Card deletion sync to Supabase for embedded/portal link cleanup
- `user_id` on local card records
- Portal → portal chaining
- `FolderPickerOverlay` / `LocationButton` wired to the new CardHeader (currently unused; shelf→library promotion happens via FolderPanel)
- EmbedSourcePanel `onCreateNew` fully tested (integration path needs test coverage)
