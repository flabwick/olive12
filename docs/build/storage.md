# Storage — implementation

IndexedDB persistence via Dexie. Covers the database schema, per-record storage functions for cards, tabs, tab_cards, and folders, and the `dirty` flag used to track cards pending Supabase sync.

## File map

```
src/
  db/
    vaultDb.js              # Dexie singleton — schema and table definitions
  card/
    cardStorage.js          # Per-record card operations (pure, no React)
    cardStorage.test.js     # [TEST]
  tab/
    tabStorage.js           # Per-record tab and tab_card operations (pure, no React)
    tabStorage.test.js      # [TEST]
  folder/
    folderStorage.js        # Per-record folder operations (pure, no React)
    folderStorage.test.js   # [TEST]
  brain/
    indexEntryStorage.js    # Per-record index_entries operations (pure, no React)
    indexEntryStorage.test.js # [TEST]
  test/
    setup.js                # Imports fake-indexeddb/auto for all unit tests
```

## Database schema

`src/db/vaultDb.js` exports a single Dexie instance (`db`) shared across the app.

```js
db.version(1).stores({
  cards:     'id',
  tabs:      'id',
  tab_cards: '[tabId+cardId], tabId',
})

db.version(2).stores({
  cards:     'id',
  tabs:      'id',
  tab_cards: '[tabId+cardId], tabId',
  folders:   'id',
})

// v3: schema-only (no upgrade callback) — added savedLocation/savedFolderId fields to tabs
db.version(3).stores({
  cards:     'id',
  tabs:      'id',
  tab_cards: '[tabId+cardId], tabId',
  folders:   'id',
})

// v4: re-runs the v3 populate step — required because the original v3 migration used
// tx.tabs (undefined in Dexie v4) instead of tx.table('tabs'), so browsers that ran
// v3 never got the field defaults. v4 is safe to run again on already-migrated records.
db.version(4).stores({
  cards:     'id',
  tabs:      'id',
  tab_cards: '[tabId+cardId], tabId',
  folders:   'id',
}).upgrade((tx) => {
  return tx.table('tabs').toCollection().modify((tab) => {
    if (tab.savedLocation === undefined) tab.savedLocation = 'none'
    if (tab.savedFolderId === undefined) tab.savedFolderId = null
  })
})

// v5: adds links table for directed edges between cards.
db.version(5).stores({
  cards:     'id',
  tabs:      'id',
  tab_cards: '[tabId+cardId], tabId',
  folders:   'id',
  links:     '[sourceCardId+targetCardId], sourceCardId, targetCardId',
})

// v6: adds index_entries table for Brain/Wiki knowledge index.
db.version(6).stores({
  cards:         'id',
  tabs:          'id',
  tab_cards:     '[tabId+cardId], tabId',
  folders:       'id',
  links:         '[sourceCardId+targetCardId], sourceCardId, targetCardId',
  index_entries: 'cardId',
})
```

| Table | Primary key | Secondary index | Notes |
|---|---|---|---|
| `cards` | `id` | — | Card records: `title`, `body`, `back`, `location`, `folderId`, `dirty`; none indexed |
| `tabs` | `id` | — | Stores tab records including `savedLocation`, `savedFolderId` |
| `tab_cards` | `[tabId+cardId]` compound | `tabId` | Compound PK; `tabId` index enables per-tab queries |
| `folders` | `id` | — | Stores folder records including `parentId`; not indexed |
| `links` | `[sourceCardId+targetCardId]` compound | `sourceCardId`, `targetCardId` | Directed edge from source to target; rebuilt on every card write |
| `index_entries` | `cardId` | — | One Brain/Wiki index entry per card; keyed by `cardId` |

The database name is `olive12`. Increment the version number and add a migration block for any schema change. Always use `tx.table('tableName')` — not `tx.tableName` — in Dexie v4 upgrade callbacks.

## Card storage

`src/card/cardStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllCards()` | Returns all records from the `cards` table |
| `putCard(card)` | Upserts the card with `dirty: true` |
| `deleteCard(cardId)` | Deletes the record by primary key |
| `getDirtyCards()` | Returns all records where `dirty === true` |
| `markCardClean(cardId, mergedCard)` | Upserts `mergedCard` with `dirty: false`; called only by the sync layer |

`putCard` always writes `dirty: true`. `markCardClean` is the only path that writes `dirty: false`. The UI ignores the `dirty` field — it is only for sync.

## Tab storage

`src/tab/tabStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllTabs()` | Returns all tab records |
| `putTab(tab)` | Upserts a tab record |
| `deleteTab(tabId)` | Deletes a tab record by primary key |
| `getAllTabCards()` | Returns all tab_card join records |
| `putTabCard(tabCard)` | Upserts a tab_card record |
| `deleteTabCard(tabId, cardId)` | Deletes by compound key `[tabId, cardId]` |
| `deleteAllTabCards(tabId)` | Deletes all tab_card records for a given tab (used when removing a tab) |

## Folder storage

`src/folder/folderStorage.js` — plain async functions, no React.

| Function | Behaviour |
|---|---|
| `getAllFolders()` | Returns all records from the `folders` table |
| `putFolder(folder)` | Upserts a folder record |
| `deleteFolder(folderId)` | Deletes the record by primary key |

## Index entry storage

`src/brain/indexEntryStorage.js` — plain async functions, no React. See [brain.md](./brain.md) for the full data shape.

| Function | Behaviour |
|---|---|
| `getAllIndexEntries()` | Returns all records from `index_entries` |
| `getIndexEntry(cardId)` | Returns the entry for a single card, or `undefined` |
| `putIndexEntry(entry)` | Upserts by `cardId` |
| `deleteIndexEntry(cardId)` | Deletes by primary key |
| `searchIndexEntries(query)` | Case-insensitive substring match over `title`, joined `tags`, and `summary`; returns results sorted by `updatedAt` desc |

Index entries are not flagged `dirty` — they are written directly to Supabase at index time rather than through the debounced sync scheduler.

## Dirty flag

Every card in Dexie has a `dirty` field.

- `putCard` → always `dirty: true`. Every mutation marks the card for sync.
- `markCardClean` → `dirty: false`. Only called by `syncDirtyCardsForUser` after a successful push or pull.
- `getDirtyCards` → filters for `dirty === true`. Used by the sync layer to find cards to push.

Tabs, tab_cards, and folders do not have a `dirty` flag — they are not synced to Supabase.

## Test setup

`fake-indexeddb/auto` is imported in `src/test/setup.js` and runs before all test files. It populates `globalThis.indexedDB` with a fresh in-memory `IDBFactory`.

Between tests within a file: each `beforeEach` calls `db.<table>.clear()`. Do not call `db.delete()` — reconnecting to a deleted Dexie database in the same module scope is unreliable in the test environment.

Between test files: Vitest runs each file in its own worker, so each file gets a fresh module scope and fresh `IDBFactory`.

## Tests

| File | What it covers |
|---|---|
| `cardStorage.test.js` | Empty load; `putCard` round-trip; `dirty: true`; upsert; `deleteCard`; `location` round-trip; `getDirtyCards`; `markCardClean` |
| `tabStorage.test.js` | Empty reads; `putTab` round-trip + upsert; `deleteTab`; `putTabCard` round-trip; `foldState`/`hiddenState`; position upsert; `deleteTabCard` by compound key; `deleteAllTabCards` removes all records for a given tabId |
| `folderStorage.test.js` | Empty read; `putFolder` round-trip; upsert; `deleteFolder`; `parentId` round-trip |
| `indexEntryStorage.test.js` | Empty read; put round-trip; `getIndexEntry` found/undefined; upsert (no duplicate); `deleteIndexEntry`; `searchIndexEntries` — title match, tag match, summary match, no-match → [], case-insensitive, sorted by updatedAt desc |

## Not built yet

- Querying or filtering cards by `location` or `folderId` (fields stored but no Dexie index exists)
- `dirty` flag on tabs, tab_cards, or folders
- Tombstoning / soft-delete (`deleted: true`)
- Card deletion sync (no remote delete when a local card is removed)
- `user_id` on any local Dexie table
- Index entry deletion from Dexie when a card is deleted (index_entries row in Supabase is auto-removed via FK cascade, but the local Dexie record is not cleaned up)
- `indexEntrySupabaseStorage.js` adapter (Supabase writes are done inline in `useTabs` for now)
