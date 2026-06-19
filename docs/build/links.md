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
    useTabs.js            # Wires rebuildLinksForCard after every putCard call
    useTabs.test.js       # [TEST] hook-level link assertions added
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

- `addCard` — text cards (no links for plain bodies, but ready when embed syntax is added)
- `addPortalCard` — writes the `portal` link immediately
- `updateCard` — handles `target_card_id` change: old link removed, new one written
- `saveToShelf` — called for each portal card created to replace the original tab instance

---

## Tests

| File | What it covers |
|---|---|
| `linkLogic.test.js` | `extractLinks`: portal, null config, embed `[[id]]` syntax, type isolation. `diffLinks`: empty, all-add, all-remove, partition. `isOrphan`: empty, source, target, unrelated. |
| `linkStorage.test.js` | Round-trip; multiple sources; upsert dedup; `getLinksForTarget`; `deleteLinksForSource` isolation; `rebuildLinksForCard` replace and clear. |
| `useTabs.test.js` | `addPortalCard` writes link; `updateCard` replacing `target_card_id` swaps link; `saveToShelf` portal card link written. |

---

## Not built yet

- Supabase sync for `links` (Brain/Wiki slice started but the links table is not yet synced — only `index_entries` is)
- Any UI rendering links (no graph view, no backlinks panel)
- Incoming links cleanup when a target card is deleted (only the source card's outgoing links are cleaned up on `removeCard`; target-side link rows from other cards are not removed)
- Container card `container_children` or process card `input_card_ids` parsing
- `@cardId` mention parsing (pattern not in use; `[[id]]` is the active embed syntax)
