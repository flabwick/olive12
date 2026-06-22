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
    createIndexEntry.test.js  # [TEST]
    finishIndexResult.js      # Normalize LLM JSON + body fallback + enrichIndexEntry
    finishIndexResult.test.js # [TEST]
    indexCard.js              # (legacy) indexCard(), computeContentHash, Dexie + Supabase persist
    indexCard.test.js         # [TEST]
    indexEntryStorage.js      # Dexie index_entries CRUD
    indexEntryStorage.test.js # [TEST]
    brainFeedLogic.js         # getStaleEntries, getOrphanCards, getBrainFeedItems
    brainFeedLogic.test.js    # [TEST]
    BrainFeed.jsx             # FolderPanel Brain tab list (uses Accept/Dismiss)
    BrainFeed.css
    BrainFeed.stories.jsx     # [STORY]
    BrainFeed.test.jsx        # [TEST]
    BrainFeedItem.jsx         # Single brain feed row: title, badge, Re-index / Accept / Dismiss buttons
    BrainFeedItem.css
    BrainFeedItem.stories.jsx # [STORY]
    BrainFeedItem.test.jsx    # [TEST]
    BrainFeedList.jsx         # Alternate list used by IndexDebugPanel or standalone display
    BrainFeedList.css
    BrainFeedList.stories.jsx # [STORY]
    BrainFeedList.test.jsx    # [TEST]
  tab/
    useTabs.js                # reindexCard, moveToLibrary → reindexCard; brainFeedItems
  card/
    CardBack.jsx              # Renders index summary/tags on back (library only)
supabase/
  functions/wiki-index/
    index.ts                  # OpenRouter call + body fallback
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
  contentHash: string, // FNV-1a hash of card body at index time
  updatedAt: number,
}
```

Stored in Dexie `index_entries` (key `cardId`) and Supabase `index_entries` (upsert on index).

## reindexCard flow (useTabs)

`reindexCard(cardId, cardOverride?)` — used everywhere indexing runs.

1. **Guard:** returns if `card.location !== 'library'`
2. **Fetch neighbors:** loads up to 10 index entries for context.
3. **Invoke** `supabase.functions.invoke('wiki-index', { body: { card, neighborEntries } })`
4. **Persist** Dexie `putIndexEntry`, then Supabase upsert (if userId, errors non-blocking)
5. **Update state** `setIndexEntries`

`computeContentHash` from `cardSyncLogic.js` hashes normalized body text for stale detection.

## finishIndexResult and body fallback

Small models often return valid JSON with `"summary": ""`. Pipeline:

1. `extractIndexPayload(text)` — strip markdown fences, find JSON object
2. Map fields to entry shape
3. If `summary` still empty and card has body → **body fallback:** first ~400 chars of plain body (`summarySource: 'body-fallback'`)
4. `enrichIndexEntry(entry, card)` — same fallback when loading existing empty summaries on flip

## When indexing runs

| Trigger | Behaviour |
|---|---|
| `moveToLibrary(cardId)` | After location update, calls `reindexCard` |
| `updateCard(cardId, fields)` | When `updated.location === 'library'`, calls `reindexCard(cardId, updated)` |
| Flip on library card | `flipCard` in `useTabs` — invokes `reindexCard` if card is library and no entry exists |
| Manual from Brain feed | `onReindex(cardId)` → `reindexCard` |

## Brain feed logic

`getBrainFeedItems(cardsById, indexEntries, allLinks)` combines:

- **`getStaleEntries`** — library cards whose `computeContentHash` differs from `entry.contentHash`
- **`getOrphanCards`** — library cards that appear as neither source nor target in `allLinks`

Results are deduplicated by cardId (stale wins over orphan), then sorted alphabetically by title.

`useTabs` builds `brainFeedItems` from library cards + index entries + `allLinks`. `allLinks` is refreshed from Dexie after any card mutation.

## Brain feed UI

**`BrainFeed`** (`BrainFeed.jsx`) — used in FolderPanel Brain tab.

Props: `items`, `onAccept`, `onDismiss`. Empty state: "No maintenance needed."

**`BrainFeedList`** (`BrainFeedList.jsx`) — alternate list component.

Props: `items`, `onReindex`. Empty state: "No issues found."

**`BrainFeedItem`** (`BrainFeedItem.jsx`) — single row.

Props: `cardId`, `title`, `reason`, `onReindex`, `onAccept`, `onDismiss`. Renders:
- Card title
- Reason badge (`Stale` / `Orphan`)
- Re-index button (when `onReindex` provided): `aria-label="Re-index {title}"`; calls `onReindex(cardId)`
- Accept button (when `onAccept` provided): calls `onAccept(cardId)` (stub in AppShell)
- Dismiss button (when `onDismiss` provided): calls `onDismiss(cardId)` (stub in AppShell)

`BrainFeed` (in FolderPanel) uses `onAccept`/`onDismiss`. `BrainFeedList` uses `onReindex`. FolderPanel receives `onReindex` from AppShell and passes it through.

## Edge function: wiki-index

POST body: `{ card, neighborEntries }`. Uses OpenRouter with JSON schema for index fields. Server-side applies body fallback when summary is empty.

Deploy:

```bash
supabase functions deploy wiki-index
```

## useTabs exports (brain-related)

```js
brainFeedItems,  // BrainFeedItem[]
flipCard,        // (cardId) → void
isFlippedCard,   // (cardId) → boolean
reindexCard,     // (cardId, cardOverride?) → void
moveToLibrary,   // triggers reindexCard
```

## Tests

| File | Covers |
|---|---|
| `createIndexEntry.test.js` | Shape + defaults |
| `finishIndexResult.test.js` | JSON parse, body fallback, enrich |
| `brainFeedLogic.test.js` | stale detection, orphan detection, dedup, sort |
| `indexCard.test.js` | library guard, invoke, persist (legacy helper) |
| `indexEntryStorage.test.js` | CRUD + search |
| `useTabs.test.js` | moveToLibrary invokes wiki-index; updateCard library triggers re-index; flip on library; shelf flip skips; reindexCard manual |
| `BrainFeed.test.jsx` | Empty state; list items; onAccept/onDismiss called |
| `BrainFeedItem.test.jsx` | Title, badge, buttons present/absent, callbacks |
| `BrainFeedList.test.jsx` | Empty state; items; onReindex called |
| `CardBack.test.jsx` | Index section library-only |

## Not built yet

- Dismiss persistence (currently session-only via `onBrainDismiss` stub)
- `onBrainAccept` → auto re-index workflow (stub: `console.log` only)
- Card `contentHash` on every save for reliable stale detection (currently only written at index time)
- Embeddings / semantic search
- Batch re-index all stale
- Brain feed Supabase sync
