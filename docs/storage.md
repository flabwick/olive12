# Storage — implementation

This document describes the IndexedDB persistence layer. It covers the Dexie singleton, per-record storage functions for cards, tabs, and folders, and the `dirty` flag used to mark records pending Supabase sync.

For the long-term vault design (Supabase, multi-user) see [design.md](./design.md). For how cards and tabs consume this layer, see [cards.md](./cards.md) and [tabs.md](./tabs.md).

## Milestone

Replace localStorage full-array writes with per-record IndexedDB operations. Every mutation calls `put` or `delete` on the relevant table directly — no full-array flushes. Cards are stamped `dirty: true` on every write so a future sync pass can identify unsynced records.

## File map

```
src/
  db/
    vaultDb.js              # Dexie singleton — schema, table definitions
  card/
    cardStorage.js          # Per-record card operations (no React)
    cardStorage.test.js     # [TEST] put/get/delete + dirty flag
  tab/
    tabStorage.js           # Per-record tab and tab_card operations (no React)
    tabStorage.test.js      # [TEST] put/get/delete for both tables
  folder/
    folderStorage.js        # Per-record folder operations (no React)
    folderStorage.test.js   # [TEST] put/get/delete + parentId round-trip
  test/
    setup.js                # Imports fake-indexeddb/auto for all unit tests
```

## Database

`src/db/vaultDb.js` exports a single Dexie instance (`db`) shared across the app.

```js
import Dexie from 'dexie'

export const db = new Dexie('olive12')

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
```

| Table | Primary key | Secondary index | Notes |
|---|---|---|---|
| `cards` | `id` | — | Stores card records including `location`, `folderId`, and `dirty`; none are indexed |
| `tabs` | `id` | — | Stores tab records |
| `tab_cards` | `[tabId+cardId]` compound | `tabId` | Compound PK; `tabId` index enables per-tab queries |
| `folders` | `id` | — | Stores folder records including `parentId`; not indexed |

The database name is `olive12`. On first open, Dexie creates it via IndexedDB. Increment the version number and add a migration block whenever the schema changes.

## Card storage

`src/card/cardStorage.js` — plain async functions, no React.

| Function | Signature | Behaviour |
|---|---|---|
| `getAllCards()` | `() → Promise<Card[]>` | Returns all records from the `cards` table |
| `putCard(card)` | `(card) → Promise<void>` | Upserts the card with `dirty: true` appended |
| `deleteCard(cardId)` | `(id) → Promise<void>` | Deletes the record by primary key |

`putCard` always merges `dirty: true` into the stored object:
```js
await db.cards.put({ ...card, dirty: true })
```

This means every card in Dexie has `dirty: true` until a future sync pass explicitly clears it. The UI ignores the `dirty` field entirely — it is only for sync.

## Tab storage

`src/tab/tabStorage.js` — plain async functions, no React.

| Function | Signature | Behaviour |
|---|---|---|
| `getAllTabs()` | `() → Promise<Tab[]>` | Returns all tab records |
| `putTab(tab)` | `(tab) → Promise<void>` | Upserts a tab record |
| `getAllTabCards()` | `() → Promise<TabCard[]>` | Returns all tab_card join records |
| `putTabCard(tabCard)` | `(tabCard) → Promise<void>` | Upserts a tab_card record |
| `deleteTabCard(tabId, cardId)` | `(string, string) → Promise<void>` | Deletes by compound key `[tabId, cardId]` |

Tabs are not flagged `dirty` in this slice — deferred to the Supabase-prep slice.

## Folder storage

`src/folder/folderStorage.js` — plain async functions, no React.

| Function | Signature | Behaviour |
|---|---|---|
| `getAllFolders()` | `() → Promise<Folder[]>` | Returns all records from the `folders` table |
| `putFolder(folder)` | `(folder) → Promise<void>` | Upserts a folder record |
| `deleteFolder(folderId)` | `(id) → Promise<void>` | Deletes the record by primary key |

Folders are not flagged `dirty` in this slice.

## Dirty flag

The `dirty` field exists on every card record in Dexie. It is always `true` after a `putCard` call. Its purpose:

- **Now**: exists but is never read; no sync occurs yet.
- **Supabase-prep slice**: a sync pass will query dirty cards and push them to Supabase, then clear the flag.

Do not add a `dirty` flag to tabs, tab_cards, or folders until the Supabase-prep slice explicitly requires it.

## Hook changes — useTabs

`useTabs` initialisation is asynchronous. A single `useEffect` on mount runs `init()`, which awaits all four `getAllXxx()` calls in parallel (`getAllTabs`, `getAllTabCards`, `getAllCards`, `getAllFolders`), then sets state. Mutations call storage functions directly — no watcher effects, no localStorage.

`useTabs` returns `isReady: boolean`. It is `false` until the async init completes.

```js
const { tab, isReady, entries, folders, addCard, createFolder, ... } = useTabs()
```

Before `isReady` is `true`, `tab` is `null`, `entries` is `[]`, and `folders` is `[]`.

## Tests

`fake-indexeddb` provides an in-memory IndexedDB implementation used in all unit tests. It is imported once in `src/test/setup.js`:

```js
import 'fake-indexeddb/auto'
```

This runs before any test file and populates `globalThis.indexedDB` with a fresh `IDBFactory`. When `vaultDb.js` is first imported in a test file, Dexie uses that factory.

**Between tests** within a file: each `beforeEach` calls `db.<table>.clear()` on the relevant tables to reset state. Do not call `db.delete()` — reconnecting to a deleted Dexie database in the same module scope is unreliable in the test environment.

**Between test files**: Vitest runs each file in its own worker, so each file gets a fresh module scope and a fresh `IDBFactory`. Cross-file leakage is not possible.

| File | What it covers |
|---|---|
| `cardStorage.test.js` | Empty read, `putCard` round-trip, `dirty: true` assertion, upsert (no duplicate), `deleteCard`, `location` round-trip and upsert |
| `tabStorage.test.js` | Empty reads, `putTab` round-trip, upsert; `putTabCard` round-trip, foldState/hiddenState round-trip, position upsert, `deleteTabCard` by compound key |
| `folderStorage.test.js` | Empty read, `putFolder` round-trip, upsert (no duplicate), `deleteFolder`, `parentId` round-trip |
| `useTabs.test.js` | All tests use `waitFor(() => isReady)` after `renderHook`; mutations wrapped in `await act(async () => {...})`; remount tests verify Dexie persistence (not just React state) |

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Querying or filtering cards by `location` or `folderId` (fields are stored but no Dexie index exists)
- `dirty` flag on tabs, tab_cards, or folders
- Tombstoning / soft-delete (`deleted: true`)
- Supabase sync pass (query dirty records, push, clear flag)
- Schema migration (version 3+ of `vaultDb`)
- `user_id` field on any table
- Dexie hooks (`db.cards.hook('creating', ...)`) for automatic dirty-stamping
