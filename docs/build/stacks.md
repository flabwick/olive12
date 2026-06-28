# Stacks — implementation

Stack cards: data shape, pure logic, storage interactions, useTabs actions, and the StackCard display component. Covers both the flat-merge (dock) and nested ("stack with this") creation paths.

## File map

```
src/
  stack/
    createStack.js          # Stack card factory + updateStackFields (pure, no React)
    createStack.test.js     # [TEST]
    stackLogic.js           # Pure helpers: addMember, removeMember, flattenIds, flattenMembers, …
    stackLogic.test.js      # [TEST]
    StackCard.jsx           # Stateful: collapsed/expanded view, member cycling, inline title edit
    StackCard.css
    StackCard.test.jsx      # [TEST]
    StackCard.stories.jsx   # [STORY]
    SelectionBar.jsx        # Dumb: selection count + action buttons (shown above tab feed)
    SelectionBar.css
    SelectionBar.test.jsx   # [TEST]
```

Stack actions live in `useTabs.js`; selection state lives in both `useTabs` (`selectedCardIds`) and `App.jsx` (`moveCardId`).

---

## Data model

### Stack card

`createStack({ title, memberIds, topCardId })` returns a full card object:

| Field | Type | Notes |
|---|---|---|
| `id` | string | `crypto.randomUUID()` |
| `type` | string | Always `'stack'` |
| `title` | string | Display name; defaults to `''` |
| `body` | string | Always `''` |
| `back` | string | Always `''` |
| `config.memberIds` | `string[]` | Ordered list of member IDs. May contain card IDs **or stack IDs** (nested stacks). |
| `config.topCardId` | `string \| null` | Which member to display in collapsed view. Defaults to `memberIds[0]`. |
| `location` | string | `'none'` at creation |
| `folderId` | string \| null | `null` at creation |
| `createdAt` | number | `Date.now()` |
| `updatedAt` | number | `Date.now()` |

**Validation:** throws if `memberIds.length === 1` (must be 0 or ≥ 2). Throws if `topCardId` is provided but not in `memberIds`.

**Nested stacks:** `config.memberIds` may include IDs of other stack cards. There is no separate type or flag — the member is just looked up in `cardsById`, and if its `type === 'stack'`, it renders as a nested group. Cycles are guarded against in `flattenMembers`.

### `updateStackFields(stack, { title, back, location, folderId, config })`

Returns a new stack with merged fields and `updatedAt: Date.now()`. `config` is shallow-merged (not replaced) when provided.

---

## Pure logic — stackLogic.js

No React, no storage, no side effects.

| Function | Signature | Description |
|---|---|---|
| `isStackCard(card)` | `(card) → boolean` | `true` when `card?.type === 'stack'` |
| `addMember(stack, cardId)` | `(stack, id) → stack` | Appends `cardId` to `memberIds`. Sets `topCardId` to `cardId` if it was `null`. |
| `removeMember(stack, cardId)` | `(stack, id) → stack \| null` | Removes member. Returns `null` if result would have < 2 members (caller should dissolve). Fixes `topCardId` to adjacent member if removed. |
| `reorderMembers(stack, fromIndex, toIndex)` | `(stack, i, j) → stack` | Moves member at `fromIndex` to `toIndex`. No-op when equal. |
| `setTopCard(stack, cardId)` | `(stack, id) → stack` | Sets `topCardId`. Throws if `cardId` not in `memberIds`. |
| `resolveTopCard(stack, cardsById)` | `(stack, map) → Card \| null` | Returns the card object for `topCardId`, falling back to `memberIds[0]`. |
| `resolveMembers(stack, cardsById)` | `(stack, map) → (Card \| null)[]` | Maps `memberIds` to card objects (nulls for missing). |
| `canDissolve(stack)` | `(stack) → boolean` | `true` when `memberIds.length <= 1`. |
| `flattenMembers(stack, cardsById)` | `(stack, map) → string[]` | Recursively collects all leaf card IDs by expanding any nested stacks. Guards against cycles. |
| `flattenIds(ids, cardsById)` | `(ids[], map) → string[]` | Like `flattenMembers` but operates on an arbitrary array of IDs — expands any that are stacks, passes through cards and unknowns as-is. Used by `stackSelectedFlat`. |

---

## useTabs stack actions

All async. All require an active tab. All call `schedulerRef.current?.scheduleSync()` on success.

### `createStack(memberIds, options?)` — low-level

Creates a stack card and adds it to the active tab. Does **not** remove member cards from the tab — use `stackSelectedFlat` or `nestMoveCardInTarget` for that.

| Option | Type | Description |
|---|---|---|
| `insertPosition` | number \| undefined | Tab position to insert the stack; defaults to end of tab |

Returns the new stack's `id`.

### `stackSelectedFlat(ids)` — flat merge (dock button)

**Used by:** the dock "Stack" button when multiple cards/stacks are selected.

1. Expands any stacks in `ids` using `flattenIds` → collects all leaf card IDs into `flatIds`.
2. Collects the stack IDs from `ids` to dissolve.
3. Creates a new flat stack card with `memberIds: flatIds`.
4. Removes all items in `ids` from the active tab.
5. Inserts the new flat stack at the position of the first selected item.
6. Deletes dissolved stack cards from Dexie (if `location === 'none'`).

Result: one flat stack replaces all selected items in the tab. No member is another stack.

### `nestMoveCardInTarget(movingId, targetId)` — nested (stack-with-this)

**Used by:** clicking "Stack with this" on a card during move mode.

Two branches:

**Target is a regular card:**
1. Creates `Stack{ memberIds: [targetId, movingId], topCardId: targetId }`.
2. Removes both `targetId` and `movingId` from the active tab.
3. Inserts the new stack at the target's original position (adjusted for moving card removal).
4. The `movingId` may itself be a stack — in that case, `memberIds` contains a stack ID, creating a nested stack.

**Target is an existing stack:**
1. Calls `addMember(targetStack, movingId)` — appends `movingId` to the stack's `memberIds`.
2. Removes `movingId` from the active tab only.
3. Does not remove the target stack from the tab.
4. Again, `movingId` may be a stack, creating a nested stack-within-stack.

In both branches: the nested item (when it is a stack) remains in `cardsById` and is referenced by ID. It is not dissolved.

### `addToStack(stackId, cardId)` — append member

Pure membership update: appends `cardId` to the stack, persists. Does **not** remove `cardId` from the tab. Used when a card is already understood to not be in the tab (e.g. dock cards).

### `removeFromStack(stackId, cardId)`

Removes `cardId` from the stack. If the result would have < 2 members, calls `dissolveStack` instead.

### `dissolveStack(stackId)`

Removes the stack from the active tab and inserts all its `memberIds` in its place (in order). Deletes the stack card from Dexie if `location === 'none'`.

### `setStackTopCard(stackId, cardId)`

Sets `topCardId` on the stack — the card shown in collapsed view.

### `reorderStackMembers(stackId, fromIndex, toIndex)`

Moves a member within a stack's `memberIds` array.

---

## Selection state and two-phase move

Card selection is a two-phase UI flow managed across `useTabs` and `App.jsx`.

### Phase 1 — selection (`useTabs`)

| Property / Action | Type | Description |
|---|---|---|
| `selectedCardIds` | `Set<string>` | IDs of checked cards in the active tab; cleared on tab switch |
| `toggleCardSelection(cardId)` | function | Adds or removes from `selectedCardIds` |
| `clearSelection()` | function | Empties `selectedCardIds` |
| `selectAll()` | function | Selects all card IDs in the active tab |

Any card type (text, file, stack) can be selected. Stack card IDs go into `selectedCardIds` directly.

### Phase 2 — move mode (`App.jsx`)

| State | Type | Description |
|---|---|---|
| `moveCardId` | `string \| null` | The single card being moved within the tab. Set by clicking "Move in tab" in the dock. Cleared on tab switch, selection clear, or move completion. |

`moveCardId` is passed to `useDock` as a parameter so the dock state machine can enter `CARD_MOVE`.

**Move mode in the tab feed:**
- Insert slots appear between every card pair except the two adjacent to the moving card (those are no-op positions).
- Each non-moving card shows a "Stack with this" or "+ Add to stack" action footer.
- `slotToPosition`: the `toPosition` value passed to `reorder`, accounting for the moving card having been removed from the array.

---

## Dock states for selection/move

Defined in `dockStateMachine.js`. Priority order (highest first):

1. `DOCK_EDITOR` — editor active on dock surface
2. `TAB_EDITOR` — editor active on tab surface
3. `CARD_MOVE` — `moveCardId` is set
4. `CARD_SELECTED` — `selectedCardCount > 0`
5. `BASE`

`computeDockState` signature: `({ activeDockCardId, activeEditorCardId, activeSurface, selectedCardCount, moveCardId })`

### CARD_SELECTED dock

Renders: `[card name or "N selected"]  |  [↕ Move icon]  [⬇ Dock icon]  |  [✕]`

- Single selection: shows the card title (truncated), Move in tab and Dock buttons.
- Multi-selection: shows "N selected", Stack button (`StackCardsIcon`), no Move button.
- ✕ clears selection.

### CARD_MOVE dock

Renders: `[card name (italic)]  |  [⬇ Dock icon]  |  [✕]`

- ✕ exits move mode (returns to CARD_SELECTED if card was still selected).

---

## StackCard component

`StackCard({ stack, cardsById, foldState, hiddenState, flipped, selected, location, onToggleFold, onToggleHide, onToggleSelect, onClose, onFlip, onUpdate, onSaveToShelf, onCyclePrev, onCycleNext, onReorderMember, onDissolve, onUpdateMember, onSaveToShelfMember, flipCard, isFlipped })`

### New props for member card passthrough

| Prop | Type | Description |
|---|---|---|
| `onUpdateMember` | `(cardId, fields) => void` | Passed from Tab's raw `onUpdate` — updates any member card by its own id |
| `onSaveToShelfMember` | `(cardId) => void` | Passed from Tab's raw `onSaveToShelf` — saves any member card |
| `flipCard` | `(cardId) => void` | App-level flip toggle, passed through for member card flip actions |
| `isFlipped` | `(cardId) => boolean` | App-level flip state query, used to compute flip state for each member |

### Two display modes

**Collapsed (default):**
- Renders the **full** `Card`, `FileCard`, or `StackCard` component for `topCardId` inside a `.stack-card__embed` wrapper.
- The embedded card is fully editable in-place (onUpdate, onFlip, onSaveToShelf all wired).
- Embedded cards track their own fold state locally via `memberFoldStates` state in StackCard.
- Cycle controls: `‹ N/total ›` below the embedded card. Disabled when only one member.

**Expanded (toggle via footer button):**
- Renders all member cards (each via `Card`/`FileCard`/`StackCard`) stacked vertically.
- Each member is in a `.stack-card__member-wrap` containing:
  - `.stack-card__embed` — the full card component
  - `.stack-card__reorder-bar` — ▲/▼ reorder buttons (only when `onReorderMember` provided)
- Nested stacks render recursively as embedded `StackCard` components.
- Dissolve button at bottom (when `onDissolve` provided).
- Footer toggle: shows "Collapse" or "N card(s)".

**Flipped:** renders `CardBack` for the stack itself (back text of the stack card, not a member card).

### Embedded card styling

Cards inside `.stack-card__embed` have their box-shadow removed and border modified so they don't double-up with the stack container's border. Controlled via `.stack-card__embed > .card`, `.stack-card__embed > .file-card`, `.stack-card__embed > .stack-card` in `StackCard.css`.

---

## Tests

| File | What it covers |
|---|---|
| `createStack.test.js` | Default fields, custom title, `memberIds.length === 1` throws, `topCardId` not-in-memberIds throws, `topCardId` defaults to first member, empty memberIds allowed, `updateStackFields` merges fields |
| `stackLogic.test.js` | `isStackCard` (true/false/null/undefined); `addMember` appends, sets topCardId when null; `removeMember` filters, fixes topCardId, returns null when < 2; `reorderMembers` moves forward/backward, no-op when same; `setTopCard` sets, throws when not member; `resolveTopCard` returns topCard, falls back to first; `resolveMembers` maps all; `canDissolve` ≤ 1; `flattenMembers` flat, recursive, cycle guard; `flattenIds` passthrough, expands stacks, unknown IDs as-is |
| `StackCard.test.jsx` | Renders stack title; collapsed preview shows topCard; cycle controls; expand/collapse toggle; expanded member list; nested stack badge; dissolve button; fold hides body; selection checkbox |
| `useTabs.test.js` (stack subset) | `stackSelectedFlat`: creates flat stack, removes selected from tab, inserts at first-selected position, flattens nested stacks, no-op for < 2 ids; `nestMoveCardInTarget`: creates stack at target position removing both, inserts at target position adjusted for moving card, adds as member when target is stack, nesting a stack into a card creates stack-in-stack; `createStack`: creates and places, returns id, does not remove source cards, respects insertPosition, appends to end; `addToStack`, `removeFromStack`, `dissolveStack`, `setStackTopCard`, `reorderStackMembers` |

---

## Not built yet

- Dissolving a nested stack back to its parents (currently dissolve replaces a stack with flat members; nested stacks stay nested)
- Drag-to-reorder within StackCard expanded view
- Clicking into a nested stack to navigate its contents
- Stack card sync to Supabase (stack cards are local-only; `config.memberIds` is not in the remote `cards` table schema)
- Converting a tab group (selected range) to a stack in one gesture
- Stack title auto-generated from member titles
