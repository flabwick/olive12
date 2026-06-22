# Links — implementation

Local directed-edge table tracking which cards reference other cards. Derived automatically on every card write. No UI, no Supabase sync.

---

## File map

```
src/
  card/
    linkLogic.js          # Pure functions — extractLinks, diffLinks, isOrphan
    linkLogic.test.js     # [TEST] unit tests for all pure functions
    linkStorage.js        # Dexie CRUD + rebuildLinksForCard orchestrator
    linkStorage.test.js   # [TEST] integration tests against fake-indexeddb
  db/
    vaultDb.js            # Version 5: adds `links` table
  tab/
    useTabs.js            # Wires rebuildLinksForCard after every putCard call; reloadLinks after mutations
    useTabs.test.js       # [TEST] hook-level link assertions added
    tabVaultLogic.js      # Pure: isCardOnTab, isOrphanTabCandidate (used for orphan detection, separate from link orphan)
    tabVaultLogic.test.js # [TEST]
```

---

## Data model

### Dexie `links` table (version 5)

```js
db.version(5).stores({
  links: '[sourceCardId+targetCardId], sourceCardId, targetCardId',
})
```

Compound primary key `[sourceCardId+targetCardId]` prevents duplicate edges and makes upsert safe. Secondary indexes on each field enable efficient directional queries.

### Link record shape

```js
{
  sourceCardId: string,   // card that references the target
  targetCardId: string,   // card being referenced
  linkType: string,       // 'portal' | 'embed'
  createdAt: number,      // Date.now() when written
}
```

---

## Pure logic (`linkLogic.js`)

| Function | Behaviour |
|---|---|
| `extractLinks(card)` | Portal cards → one link per `config.target_card_id`. Text cards → one link per `[[id]]` embed found in body. Returns `[]` for all other cases. |
| `diffLinks(existingLinks, newLinks)` | Diffs by `targetCardId`. Returns `{ toAdd, toRemove }`. Pure utility; not called by `rebuildLinksForCard` (which delete-and-reinserts). |
| `isOrphan(cardId, allLinks)` | Returns `true` if `cardId` appears as neither source nor target in `allLinks`. |

---

## Storage (`linkStorage.js`)

| Function | Behaviour |
|---|---|
| `getLinksForSource(cardId)` | All outgoing links from this card |
| `getLinksForTarget(cardId)` | All incoming links to this card |
| `putLinks(links[])` | Bulk upsert — compound PK prevents duplicates |
| `deleteLinksForSource(cardId)` | Removes all outgoing links for this card |
| `rebuildLinksForCard(card)` | Deletes all outgoing links then re-extracts and writes from current card state |

---

## Wiring into useTabs

`rebuildLinksForCard` is called after every `putCard` in:

- `addCard` — text cards
- `addPortalCard` — writes the `portal` link immediately
- `updateCard` — handles `target_card_id` change or embed token changes
- `saveToShelf` — called for each portal card created to replace the original tab instance

After each rebuild, `reloadLinks()` refreshes `allLinks` state from Dexie, which drives `brainFeedItems` (orphan detection) and link storage queries.

---

## Tests

| File | What it covers |
|---|---|
| `linkLogic.test.js` | `extractLinks`: portal, null config, embed `[[id]]` syntax, type isolation. `diffLinks`: empty, all-add, all-remove, partition. `isOrphan`: empty, source, target, unrelated. |
| `linkStorage.test.js` | Round-trip; multiple sources; upsert dedup; `getLinksForTarget`; `deleteLinksForSource` isolation; `rebuildLinksForCard` replace and clear. |
| `useTabs.test.js` | `addPortalCard` writes link; `updateCard` replacing `target_card_id` swaps link; `saveToShelf` portal card link written. |

---

## Embed rendering

`[[cardId]]` tokens in a card's markdown body are:
1. Extracted by `extractLinks` → stored as `linkType: 'embed'` edges in the `links` table.
2. Rendered in the Tiptap editor as `EmbeddedCardNode` inline atoms — each `EmbeddedCardNode` renders an `EmbeddedCardView` React component showing the full card with header controls, editable body, and resize handle (see [cards.md](./cards.md)).
3. Round-tripped via `richTextLogic.js`: `[[cardId]]` → `<span data-card-id="...">[[cardId]]</span>` on load; Turndown rule converts back on save.

The card body always stores plain markdown (not HTML). The `[[cardId]]` token is the canonical on-disk format.

---

## Not built yet

- Supabase sync for `links` (only `index_entries` is synced)
- Any UI rendering links (no graph view, no backlinks panel)
- Incoming links cleanup when a target card is deleted
- Container card or process card parsing
