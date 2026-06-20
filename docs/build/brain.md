# Brain — wiki index, Brain feed, and library-only indexing

The brain layer turns **library** cards into searchable wiki index entries (title, tags, summary, links) via OpenRouter, stores them locally and in Supabase, and surfaces maintenance items in the FolderPanel Brain tab.

**Library-only rule:** wiki-index is never invoked for shelf or tab cards. Flip back shows the Index section only when `location === 'library'`.

For card flip UI see [cards.md](./cards.md). For pipeline tracing see [debug.md](./debug.md).

## File map

```
src/
  brain/
    index.js                  # Re-exports
    createIndexEntry.js       # Pure shape for index entry records
    createIndexEntry.test.js
    finishIndexResult.js      # Normalize LLM JSON + body fallback + enrichIndexEntry
    finishIndexResult.test.js
    indexCard.js              # indexCard(), computeContentHash, Dexie + Supabase persist
    indexCard.test.js
    indexEntryStorage.js      # Dexie index_entries CRUD
    indexEntryStorage.test.js
    brainFeedLogic.js         # detectStaleEntries (stale hash + orphan)
    brainFeedLogic.test.js
    BrainFeed.jsx             # List in FolderPanel Brain tab
    BrainFeedItem.jsx
    BrainFeed.css / BrainFeedItem.css
  tab/
    useTabs.js                # moveToLibrary → indexCard; flip ensureIndex; brainFeedItems
  card/
    CardBack.jsx              # Renders index summary/tags on back (library only)
supabase/
  functions/wiki-index/
    index.ts                  # OpenRouter call + parseIndexResult (body fallback)
  migrations/
    20260620000000_create_index_entries.sql
```

## Index entry shape

```js
{
  cardId: string,      // uuid of source card
  title: string,
  tags: string[],
  summary: string,
  links: string[],     // card ids extracted by LLM
  contentHash: string, // hash of card body at index time
  updatedAt: number,
}
```

Stored in Dexie `index_entries` (key `cardId`) and Supabase `index_entries` (upsert on index).

## indexCard flow

1. **Guard:** throws if `card.location !== 'library'`
2. **Invoke** `supabase.functions.invoke('wiki-index', { body: { title, body, cardId } })`
3. **Parse** response via `finishIndexResult(raw, card)` — see below
4. **Persist** Dexie `putIndexEntry`, then Supabase upsert (errors logged, non-blocking)
5. **Return** finished entry

`computeContentHash(card)` hashes normalised body text for stale detection.

## finishIndexResult and body fallback

Small models (e.g. llama-3.2-3b) often return valid JSON with `"summary": ""`. Pipeline:

1. `extractIndexPayload(text)` — strip markdown fences, find JSON object
2. Map fields to entry shape
3. If `summary` still empty and card has body → **body fallback:** first ~400 chars of plain body as summary (`summarySource: 'body-fallback'`)
4. `enrichIndexEntry(entry, card)` — same fallback when loading existing empty summaries on flip

## When indexing runs

| Trigger | Behaviour |
|---|---|
| `moveToLibrary(cardId)` | After location update, calls `indexCard` for that card (and portal target if applicable) |
| Flip on library card with no entry | `ensureIndexEntry` in `flipCard` — invokes `indexCard` if missing |
| Flip on shelf/tab card | No index call; CardBack shows notes only (no Index section) |

Indexing state: `indexLoadingIds` Set exposed as `isIndexing(cardId)`.

## Resolving index on tab entries

Portal and nested cards resolve index against the **target** card id:

- `resolveIndexTargetId(entry)` — portal → `entry.card.targetId`, else `entry.card.id`
- `resolveIndexTarget(entry, cardsById)` — full card for location checks

Tab `entries` include:

```js
indexEntry      // from indexEntriesById[targetId], only if target.location === 'library'
indexLocation   // target card location
indexLoading    // isIndexing(targetId)
```

## Card back display

When flipped and `indexLocation === 'library'`, CardBack shows:

- Loading spinner while `indexLoading`
- Title, summary, tags from `indexEntry`
- Empty state if no entry yet (may still be indexing)
- Inline Index debug `<details>` (see [debug.md](./debug.md))

## Brain feed

`detectStaleEntries(libraryCards, indexEntries, allLinks)` flags:

- **stale** — card has `contentHash` and index entry hash differs (card edited since index)
- **orphan** — card has no incoming links (`linkLogic.isOrphan`)

`useTabs` builds `brainFeedItems` from library cards + index entries + links. Rendered in FolderPanel **Brain** tab via `BrainFeed` / `BrainFeedItem`.

| Action | Status |
|---|---|
| Dismiss | Removes item from local `dismissedBrainIds` Set |
| Accept | **Stub** — `console.log` only; should re-run `indexCard` |

Note: live cards do not yet persist `contentHash` on the card record (only on index entries), so stale detection mainly activates when tests or future sync add card-side hashes.

## Edge function: wiki-index

POST body: `{ title, body, cardId }`. Uses OpenRouter with JSON schema for index fields. Server-side `parseIndexResult` mirrors client fallback (empty summary → body excerpt).

Deploy after changes:

```bash
supabase functions deploy wiki-index
```

## useTabs exports (brain-related)

```js
brainFeedItems, onBrainAccept, onBrainDismiss,
flipCard, isFlipped, getIndexEntry, isIndexing,
moveToLibrary,  // triggers indexing
```

## Tests

| File | Covers |
|---|---|
| `indexCard.test.js` | library guard, invoke, persist |
| `finishIndexResult.test.js` | JSON parse, body fallback, enrich |
| `brainFeedLogic.test.js` | stale/orphan detection |
| `useTabs.test.js` | moveToLibrary invokes wiki-index; flip index on library; shelf flip skips |
| `CardBack.test.jsx` | Index section library-only |

## Not built yet

- `onBrainAccept` → re-index workflow
- Card `contentHash` on every edit for reliable stale feed
- Embeddings / semantic search
- Batch re-index all stale
- Brain feed Supabase sync
