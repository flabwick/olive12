# Vault — implementation

This document describes the `VaultView` component: the root layout that exposes the Tab, Shelf, and Library panes.

For the long-term vault design see [design.md](./design.md). For cards and tabs this builds on, see [cards.md](./cards.md) and [tabs.md](./tabs.md).

## Milestone

Turn the `location` field (a latent flag) into navigable views. A nav strip switches between three panes — Tab (writing surface), Shelf (saved cards), Library (promoted cards). All three reuse the existing `Card` component.

## File map

```
src/
  vault/
    VaultView.jsx         # Dumb layout component; owns transientOpen toggle only
    VaultView.css
    VaultView.test.jsx    # [TEST]
    VaultView.stories.jsx # [STORY]
```

## VaultView

`VaultView` is a presentational component. It owns no persistence or derived state — those live in `useTabs`. The only local state it owns is `transientOpen` (whether the TransientCard form is visible), which is ephemeral UI.

### Props

| Prop | Type | Description |
|---|---|---|
| `view` | `'tab' \| 'shelf' \| 'library'` | Active pane; controlled by parent |
| `onChangeView` | `function` | `(nextView) => void` — called on nav button click |
| `tabEntries` | `Entry[]` | Tab entries from `useTabs` |
| `shelfEntries` | `Card[]` | Cards with `location === 'shelf'`, sorted by `createdAt` ascending |
| `libraryEntries` | `Card[]` | Cards with `location === 'library'`, sorted by `updatedAt` descending |
| `onAddCard` | `function` | `({ title, body }) => void` |
| `onUpdateCard` | `function` | `(cardId, fields) => void` |
| `onRemoveCard` | `function` | `(cardId) => void` |
| `onReorder` | `function` | `(cardId, toPosition) => void` |
| `onFold`, `onUnfold`, `onHide`, `onUnhide` | `function` | Tab-only callbacks; forwarded to `Tab` |
| `onSaveToShelf` | `function` | Forwarded to Tab cards and Shelf cards (not Library) |
| `onMoveToLibrary` | `function` | Forwarded to Tab cards and Shelf cards |

### Pane behavior

**Tab pane** (`view === 'tab'`):
- Renders `Tab` with all callbacks.
- Renders `TransientCard` when `transientOpen` is true.
- Renders `Dock` always; disabled while `transientOpen` is true.

**Shelf pane** (`view === 'shelf'`):
- Renders a `<ul>` of `Card` components from `shelfEntries`.
- Cards receive `onUpdate` and `onMoveToLibrary` (no fold/reorder/hide/close).
- Empty state: `"Shelf is empty. Save some cards from your tab."`
- No Dock or TransientCard.

**Library pane** (`view === 'library'`):
- Renders a `<ul>` of `Card` components from `libraryEntries`.
- Cards receive `onUpdate` only (location is terminal — no location button shown).
- Empty state: `"Library is empty. Promote cards here when they're ready."`
- No Dock or TransientCard.

### Nav

A `role="tablist"` strip renders three `role="tab"` buttons (Tab / Shelf / Library). The active button has `aria-selected="true"`. Clicking a button calls `onChangeView` with the corresponding view string.

## Tests

| File | What it covers |
|---|---|
| `VaultView.test.jsx` | Three view buttons render and aria-selected tracks active view; onChangeView called with correct value; tab pane shows tabEntries and Dock; shelf pane shows shelfEntries (or empty state) and location buttons; library pane shows libraryEntries (or empty state); no Dock in shelf/library; no location button in library |

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Search, tagging, or filters within Shelf or Library
- Brain/Wiki indexing (`index_entries`, staleness, contradictions)
- LLM integration / Dock Prompt
- Supabase sync
- Multiple tabs (VaultView renders a single tab)
- Drag-and-drop reorder within any pane
