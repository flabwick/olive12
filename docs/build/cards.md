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
    CardHeader.jsx              # Dumb header strip: fold caret, title, right-side controls
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
    RichTextEditor.jsx          # Tiptap editor wrapper: Tiptap extensions, streaming sync
    RichTextEditor.css
    RichTextEditor.test.jsx     # [TEST]
    RichTextEditor.stories.jsx  # [STORY]
    EmbeddedCardNode.js         # Tiptap Node extension for [[cardId]] — renders EmbeddedCardView
    EmbeddedCardView.jsx        # React NodeView for embedded cards: full CardHeader + editable body + resize
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

`createCard({ title = '', body = '', type = 'text', config = null })` returns:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `type` | string | `'text'` or `'portal'` |
| `title` | string | Empty string for portal cards (content comes from target) |
| `body` | string | Plain text markdown; empty string for portal cards |
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
| `onSaveToShelf` | function \| undefined | If provided, renders save bookmark icon. Shows `SaveIcon` when `location === 'none'`, `CheckIcon` (disabled) when already saved |
| `onToggleFold` | function \| undefined | If provided, renders the fold caret button (left of title) |
| `onToggleHide` | function \| undefined | If provided, renders the eye button |
| `onSendToDock` | function \| undefined | If provided, renders the send-to-dock arrow button (down-arrow to baseline) |
| `onSendToTab` | function \| undefined | If provided, renders the send-to-tab arrow button (up-arrow from baseline) |
| `onClose` | function \| undefined | If provided, renders the X close button |

**Removed from CardHeader:** `onMoveUp`, `onMoveDown`, `onFlip`, `flipped`, `folders`. Move-up/move-down and flip are no longer part of the header controls.

**Controls rendered (all in `.card-header__controls` right group):**
- `onSaveToShelf`: bookmark icon (`aria-label="Save card"`) when `location === 'none'`; checkmark icon disabled (`aria-label="Saved"`) when location is `'shelf'` or `'library'`
- `onToggleHide`: eye icon (`aria-label="Dim card"` / `"Show card"`)
- `onSendToDock`: down-arrow icon (`aria-label="Move to dock"`)
- `onSendToTab`: up-arrow icon (`aria-label="Move to tab"`)
- `onClose`: X icon (`aria-label="Remove card"`)

The controls group only renders if at least one of those callbacks is provided.

## Card component

Stateful: manages `editing`, draft title/body/back. Composes `CardHeader` and `RichTextEditor`.

Key props: `cardId`, `title`, `body`, `back`, `flipped`, `foldState`, `hiddenState`, `location`, `onToggleFold`, `onToggleHide`, `onSendToDock`, `onSendToTab`, `onUpdate`, `onClose`, `onSaveToShelf`, `onFlip`, `indexEntry`, `indexLoading`, `editorSurface`.

**No `onMoveUp`, `onMoveDown`, `onFlip` passed to `CardHeader`.** Flip state is driven externally (from `useTabs`) and `flipped` toggles between body and `CardBack`. The flip button has been removed from `CardHeader`; the back face has its own "Flip to front" button in `CardBack`.

**`editorSurface`** — `'tab'` (default) or `'dock'`. Forwarded to `RichTextEditor`, which forwards it to `RichTextEditorContext.registerEditor(cardId, editorSurface, editor)`. The dock state machine uses this to distinguish a dock-surface edit from a tab-surface edit.

**Title editing:** Click title `h3` (when `onUpdate` provided and not flipped) → enters edit mode with title input focused. Also enters edit mode when clicking body. Commit on focus leaving the card entirely (`onBlur` that checks `relatedTarget`). Escape cancels.

**Body editing:** Click body area → enters edit mode. `RichTextEditor` becomes editable. Commit on blur.

**Back editing (when flipped):** Click inside the back face → enters edit mode on the back field. Commit on blur.

**`flushAndThen(action)`** — used by `onSendToDock`/`onSendToTab` to commit any pending edit before the card is moved.

**`useBodyResize`** hook — drag handle at the bottom of the body area for manual height control.

## Rich text system

### richTextLogic.js

Pure serialization — no React, no storage.

| Function | Behaviour |
|---|---|
| `markdownToHtml(md)` | Parses markdown to HTML. A marked inline extension converts `[[cardId]]` tokens to `<span data-card-id="cardId">[[cardId]]</span>` before parsing. Returns `''` for blank input. |
| `htmlToMarkdown(html)` | Converts HTML to markdown via Turndown. A custom rule converts `<span data-card-id="...">` back to `[[cardId]]`. GFM strikethrough rule registered. |
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
- No separate embed bar in the editor itself — embed insertion is triggered from the Dock's `[[]]` button (`onEmbedOpen` in AppShell).

### EmbeddedCardNode and EmbeddedCardView

`EmbeddedCardNode` (`src/card/EmbeddedCardNode.js`) is a Tiptap `Node.create` extension.

- `group: 'inline'`, `inline: true`, `atom: true`.
- `addAttributes`: `cardId` — parsed from `data-card-id`, rendered back to `data-card-id`.
- `parseHTML`: matches `span[data-card-id]`.
- `renderHTML`: outputs `<span data-card-id="..." class="embedded-card-node">[[cardId]]</span>` (used only for HTML export / Turndown serialization).
- `addNodeView()`: renders `EmbeddedCardView` React component via `ReactNodeViewRenderer`. `stopEvent: () => true` for non-drag events prevents ProseMirror from claiming mouse interactions inside the node view.

`EmbeddedCardView` (`src/card/EmbeddedCardView.jsx`) is the actual React display for embedded cards inside the editor.

- Reads card data from `useEmbedEntries()` (vault card entries via context).
- Reads action callbacks from `useEmbedActions()`: `onSaveToShelf`, `onMoveToDock`, `onUpdate`.
- Full `CardHeader` with: fold toggle, save button, send-to-dock button, close (deletes node).
- Body: rendered as HTML from `markdownToHtml(card.body)`. Click to enter edit mode (plain `textarea` — not Tiptap, to avoid nested editors).
- Title: click to enter edit mode (text input). Commit on blur/Enter; Escape cancels.
- Drag-to-resize handle (via `useBodyResize`).
- Falls back to `[[cardId]]` badge when card is not found in entries.

### EmbedEntriesContext and EmbedActionsContext

Two separate contexts in `src/card/EmbedEntriesContext.jsx`:

**`EmbedEntriesProvider({ entries, children })` / `useEmbedEntries()`** — provides the flat list of all cards (`Object.values(cardsById)`) to embedded card views.

`AppShell` wraps with `<EmbedEntriesProvider entries={Object.values(cardsById)}>`.

**`EmbedActionsProvider({ onSaveToShelf, onMoveToDock, onMoveToTab, onUpdate, children })` / `useEmbedActions()`** — provides action callbacks to `EmbeddedCardView` without prop drilling.

`AppShell` wraps with `<EmbedActionsProvider onSaveToShelf={saveToShelf} onMoveToDock={addToDock} onMoveToTab={addTabCard} onUpdate={updateCard}>`.

### EmbedSourcePanel

`EmbedSourcePanel({ entries, onSelect, onClose, onCreateNew })` — dumb searchable picker rendered by `AppShell` when `embedOpen` is true.

- `role="dialog" aria-label="Insert embed"`.
- Search input filters `entries` by card title (case-insensitive substring).
- Clicking a card button calls `onSelect(card.id)`.
- Cancel button calls `onClose`.
- `onCreateNew` — if provided, creates a new empty card and inserts it immediately.
- Empty state: "No cards found."

## CardBack component

Back face rendered when a card is flipped. Props include `cardId`, `back`, `location`, `createdAt`, `updatedAt`, `indexEntry`, `indexLoading`, `onUpdateBack`, `onFlip`, `editing`, `onBackChange`.

| Section | When shown |
|---|---|
| Flip-to-front button | Always — calls `onFlip` |
| Notes | Always — editable textarea when `editing` is true (Card drives edit mode) |
| Metadata | Created / updated timestamps |
| Index | Only when `location === 'library'` — title, summary, tags from `indexEntry`; spinner when `indexLoading` |
| Index debug | Collapsible `<details>` with pipeline state (see [debug.md](./debug.md)) |

## flipLogic.js

Pure helpers. No React, no side effects.

| Function | Behaviour |
|---|---|
| `canFlip(card)` | `true` when `type === 'text'` and `back` is non-empty after trim |
| `toggleFlip(flippedSet, cardId)` | Returns a **new** `Set` with `cardId` added if absent, removed if present. Does not mutate the input. |
| `isFlipped(flippedSet, cardId)` | Returns `boolean` — whether `cardId` is in `flippedSet`. |

Flip state lives in `useTabs` as `flippedCardIds` (a `Set<string>`). `flipCard(cardId)` uses `toggleFlip` to produce a new set; `isFlippedCard(cardId)` uses `isFlipped` to read it. The flip button in the header has been removed — flipping now happens only from the CardBack "Flip to front" button or from Tab-level gestures.

## PortalCard component

`PortalCard` is a thin wrapper around `Card`. It resolves the portal target and delegates all rendering to `Card`.

Props: `config`, `cardsById`, `foldState`, `hiddenState`, `location`, `flipped`, `indexEntry`, `indexLoading`, `onToggleFold`, `onToggleHide`, `onFlip`, `onMoveUp`, `onMoveDown`, `onClose`, `onUpdate`, `onLocate`.

**No `onSaveToShelf`** — portal cards cannot be saved to shelf directly (only the underlying target can).

Note: `onMoveUp` and `onMoveDown` are still accepted by `PortalCard` and forwarded to `Card`, but `Card` does not use them (they were removed from `CardHeader`). `onFlip` is forwarded to `CardBack` for the "Flip to front" button.

**Resolution:** `resolvePortalTarget` is called with `{ config }` and `cardsById`. When the target exists, `Card` receives the target's `title` and `body`. When the target is absent, `Card` renders `title="Portal — no target"` and `body="No card linked."`.

**Editing:** `onUpdate` is forwarded to `Card` only when the target exists. Edits go through the caller-bound target card id.

**Locate button:** When both `target` and `onLocate` are provided, a small circular button (`aria-label="Show in vault"`) is rendered as an absolute overlay. Clicking it calls `onLocate()`. Hidden when target is null.

## Tests

| File | What it covers |
|---|---|
| `createCard.test.js` | Default fields; custom title/body; unique ids; `updateCardFields` partial/full update; portal card creation |
| `cardStorage.test.js` | Empty load; `putCard` round-trip; `dirty: true`; upsert; `deleteCard`; `location` round-trip; `getDirtyCards`; `markCardClean`; portal card config round-trip |
| `useCards.test.js` | Load on mount, add + persist, remount reload |
| `portalLogic.test.js` | `isPortalCard` true/false/null/undefined; `resolvePortalTarget` found/null-targetId/not-in-map/null-config/null-portalCard/empty-cardsById |
| `CardHeader.test.jsx` | Renders title; no buttons without callbacks; fold/hide/save/sendToDock/sendToTab/close callbacks; aria-labels; title focusable when onTitleClick provided; save icon states (none/shelf/library); confirms no move-up/move-down/flip buttons |
| `Card.test.jsx` | Renders title/body; fold hides body and resize handle; hidden applies `.card--hidden`; resize handle present/absent; inline editing (click title, click body, commit on blur, cancel on Escape, no save if unchanged); flip: CardBack renders when flipped=true, flip header button absent, card--flipped class, back edit commits/cancels; location: Save card button / no-op for shelf/library |
| `PortalCard.test.jsx` | Renders target title/body; placeholder when target null; placeholder when cardsById missing target; fold hides body; hiddenState; onClose; onUpdate called with edited fields; null target not editable; Show in vault button present/absent/calls onLocate |
| `flipLogic.test.js` | `canFlip` for text/portal/empty back; `toggleFlip` adds/removes/non-mutating; `isFlipped` true/false/empty |
| `CardBack.test.jsx` | Notes render; index section library-only; loading state; debug details |
| `richTextLogic.test.js` | `markdownToHtml` bold/italic/heading/list/empty/embed token; `htmlToMarkdown` strong/em/h1/del/span[data-card-id]; embed roundtrip; `isEmptyMarkdown` variants |
| `RichTextEditor.test.jsx` | Renders without crashing; markdown value renders; bold markdown; aria-label; onChange prop; embedded-card-node renders for [[cardId]] value |
| `EmbedSourcePanel.test.jsx` | Search input; renders entry buttons; filter by title; no-match state; onSelect called with cardId; onClose called; dialog label; empty state |
| `useBodyResize.test.js` | Resize behavior via pointer events |
| `linkLogic.test.js` | `extractLinks`: portal, null config, embed `[[id]]` syntax. `diffLinks`: empty/add/remove/partition. `isOrphan`: empty/source/target/unrelated. |
| `linkStorage.test.js` | Round-trip; multiple sources; upsert dedup; `getLinksForTarget`; `deleteLinksForSource` isolation; `rebuildLinksForCard` replace and clear. |

## Not built yet

- Process and container card types
- Per-card colour or tags on front face
- Card deletion sync to Supabase for embedded/portal link cleanup (target-side links from other cards not removed)
- `user_id` on local card records
- Portal → portal chaining
- `FolderPickerOverlay` / `LocationButton` wired to the new CardHeader (currently unused; shelf→library promotion happens via FolderPanel)
- EmbedSourcePanel `onCreateNew` fully tested (integration path needs test coverage)
