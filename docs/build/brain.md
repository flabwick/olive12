# Brain / Wiki Index — implementation

Knowledge indexing layer: an `index_entries` table in Dexie and Supabase, a pure `createIndexEntry` factory, a `wiki-index` Edge Function that writes a structured index entry from a card, and wiring in `useTabs.moveToLibrary` that triggers indexing on promotion.

For the Dexie schema this extends, see [storage.md](./storage.md). For `useTabs` and `moveToLibrary`, see [tabs.md](./tabs.md). For Supabase setup, see [supabase-setup.md](./supabase-setup.md).

## File map

```
src/
  brain/
    createIndexEntry.js          # Pure factory: IndexEntry data shape
    createIndexEntry.test.js     # [TEST] 6 unit tests
    indexEntryStorage.js         # Dexie-backed storage for index_entries (pure, no React)
    indexEntryStorage.test.js    # [TEST] 11 integration tests
  db/
    vaultDb.js                   # Version 6: adds `index_entries` table
  tab/
    useTabs.js                   # Extended: moveToLibrary triggers wiki-index + putIndexEntry
supabase/
  functions/
    wiki-index/
      index.ts                   # Deno Edge Function: card → { title, tags, summary, links }
  migrations/
    20260620000000_create_index_entries.sql
```

## Data model

### IndexEntry

`createIndexEntry({ cardId, title, tags, summary, links, contentHash })` returns:

| Field | Type | Notes |
|---|---|---|
| `cardId` | string | Primary key — one entry per card |
| `title` | string | Index title (may differ from the card's own title); default `''` |
| `tags` | string[] | Lowercase keyword strings; default `[]` |
| `summary` | string | 1–2 sentence description; default `''` |
| `links` | string[] | Card ids this entry references; default `[]` |
| `contentHash` | string | FNV-1a hash of the card at index time (matches `computeContentHash`); default `''` |
| `updatedAt` | number | `Date.now()` at creation |

There is no separate `id` field — `cardId` is the primary key in both Dexie and Supabase.

## Dexie schema — version 6

```js
db.version(6).stores({
  cards:         'id',
  tabs:          'id',
  tab_cards:     '[tabId+cardId], tabId',
  folders:       'id',
  links:         '[sourceCardId+targetCardId], sourceCardId, targetCardId',
  index_entries: 'cardId',
})
```

No upgrade callback — the new table starts empty; no migration of existing data is needed.

## Index entry storage

`src/brain/indexEntryStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllIndexEntries()` | Returns all records from `index_entries` |
| `getIndexEntry(cardId)` | Returns the entry for a single card, or `undefined` |
| `putIndexEntry(entry)` | Upserts by `cardId` |
| `deleteIndexEntry(cardId)` | Deletes by primary key |
| `searchIndexEntries(query)` | Case-insensitive substring match over `title`, joined `tags`, and `summary`. Loads all entries into memory and filters in JS. Returns matched entries sorted by `updatedAt` desc. |

`searchIndexEntries` is a full in-memory scan — fast enough for the current scale. No Dexie index on text fields is needed at this stage.

## Supabase table — index_entries

Migration: `supabase/migrations/20260620000000_create_index_entries.sql`

| Column | Type | Notes |
|---|---|---|
| `card_id` | uuid PK | FK → `cards(id)` ON DELETE CASCADE |
| `user_id` | uuid NOT NULL | FK → `auth.users(id)`; enforced by RLS |
| `title` | text | Default `''` |
| `tags` | text[] | Default `'{}'` |
| `summary` | text | Default `''` |
| `links` | text[] | Card ids; default `'{}'` |
| `content_hash` | text | Default `''` |
| `updated_at` | timestamptz | Default `now()` |

RLS is enabled. A single `for all` policy allows users to read and write only their own rows (`auth.uid() = user_id`).

The `ON DELETE CASCADE` on `card_id` means deleting a card from Supabase automatically removes its index entry.

## Edge Function — wiki-index

**Deploy command** (run by the human outside this session):
```bash
supabase functions deploy wiki-index
```

**Prerequisites:**
- `OPENROUTER_API_KEY` secret set (same key used by `dock-prompt`)

**Request shape:**
```json
{
  "card": { "id": "...", "title": "...", "body": "...", "config": {} },
  "neighborEntries": [{ "cardId": "...", "title": "...", "tags": [...], ... }]
}
```

**Response shape on success:**
```json
{ "title": "string", "tags": ["string"], "summary": "string", "links": ["card-id"] }
```

`neighborEntries` is a bounded sample of existing index entries — provides the model with context about what's already in the knowledge base. The caller passes up to 10.

**Model config** (top of `index.ts`, the only place model selection lives):
```ts
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.3,
  maxTokens: 500,
}
```

The function instructs the model to return a plain JSON object (no code fences). If the model wraps output in backtick fences, `parseIndexResult` strips them before parsing. On a JSON parse failure, the function falls back to `{ title: '', tags: [], summary: <first 200 chars of raw content>, links: [] }` — the caller always gets a usable shape.

## Wiring — useTabs.moveToLibrary

When `moveToLibrary(cardId, folderId?)` is called:

1. Updates card `location` to `'library'` and persists to Dexie (unchanged from before).
2. Schedules a Supabase card sync (unchanged from before).
3. Fetches up to 10 existing index entries from Dexie as the neighbor sample.
4. Invokes `wiki-index` with the updated card + neighbor entries.
5. On success: constructs an `IndexEntry` via `createIndexEntry`, writes it to Dexie via `putIndexEntry`.
6. If `userId` is present: upserts the entry to Supabase `index_entries` directly (not through the debounced sync scheduler).

Steps 3–6 run in a `try/catch` — any wiki-index failure is logged and silently swallowed. The card save in step 1 is never blocked by indexing.

The Supabase write in step 6 uses `supabase.from('index_entries').upsert(...)` directly (no adapter abstraction yet, same pattern as would be added in a future indexEntrySupabaseStorage layer).

## Tests

| File | What it covers |
|---|---|
| `createIndexEntry.test.js` | Default fields (title/tags/summary/links/contentHash all default); custom values; no `id` field (cardId is the PK); `updatedAt` stamped with `Date.now()` |
| `indexEntryStorage.test.js` | Empty read; put round-trip; `getIndexEntry` found/undefined; upsert (no duplicate); `deleteIndexEntry`; `searchIndexEntries`: title match, tag match, summary match, no-match → [], case-insensitive, results sorted by updatedAt desc |

No hook-level or E2E tests for the wiki-index wiring yet — the `moveToLibrary` path is covered in `useTabs.test.js` at the card-state level only (the AI call path is not exercised in the test suite).

## Not built yet

- Re-indexing when a library card is updated (currently only promotion triggers indexing)
- Stale index detection (content hash drift between `index_entries.contentHash` and the live card)
- Brain feed UI: contradiction flagging, orphan detection, staleness display
- `indexEntrySupabaseStorage.js` adapter (Supabase write is done inline in `useTabs` for now)
- Full-library scan or batch re-indexing
- Embedding / vector search (current search is plain JS substring match)
- Incoming links (`links` field is populated by the model from the card body, not from the Dexie `links` table)
- FolderPanel Brain pane content (currently "coming soon" placeholder)
- Index entry deletion when a card is deleted from the library
