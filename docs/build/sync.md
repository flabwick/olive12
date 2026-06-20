# Sync — implementation

Supabase card sync: pure conflict-resolution logic, Supabase storage adapter, sync orchestration, and the dock-prompt AI loop.

## What syncs

| Data | Syncs to Supabase |
|---|---|
| Card `title`, `body`, `location` (text and portal cards) | Yes — on every mutation, debounced 3 s |
| Portal card `config` (`target_card_id`) | Yes — portal cards go through the same `putCard` path |
| Card deletion | Yes — immediate on `removeCard` |
| Card `folderId` | No — local only |
| Tabs (saved to shelf/library) | Yes — `user_tabs` via `tabSupabaseStorage` when authenticated |
| Tab_card order, `foldState`, `hiddenState` | No — Dexie only |
| Folders | No — Dexie only |
| Index entries (`index_entries`) | Yes — via `indexCard.js` → Dexie + Supabase upsert on library promotion or flip ensure; not through the debounced card scheduler |

## File map

```
src/
  lib/
    supabaseClient.js               # Supabase singleton (reads from .env)
  sync/
    cardSyncLogic.js                # Pure: FNV-1a hash, classify, resolve conflict
    cardSyncLogic.test.js           # [TEST] 19 tests
    cardSupabaseStorage.js          # Supabase adapter factory (no default export)
    cardSupabaseStorage.test.js     # [TEST] 9 tests
    cardSync.js                     # Orchestration: syncDirty, pullRemote, scheduler
    cardSync.test.js                # [TEST] 14 tests
  brain/
    indexCard.js                    # wiki-index invoke, finishIndexResult, Dexie + Supabase persist
    indexCard.test.js
  tab/
    tabSupabaseStorage.js           # user_tabs upsert for saved tabs
    tabSupabaseStorage.test.js
  prompt/
    assembleContext.js              # Pure: filters entries to visible contextCards
    assembleContext.test.js         # [TEST] 6 tests
    buildPrompt.js                  # Pure: builds OpenRouter messages array
    buildPrompt.test.js             # [TEST] 7 tests
supabase/
  functions/
    dock-prompt/
      index.ts                      # Deno Edge Function: OpenRouter call → { title, body }
    wiki-index/
      index.ts                      # Deno Edge Function: card + neighbors → { title, tags, summary, links }
  migrations/
    20260618000000_create_cards.sql           # Cards table + RLS
    20260620000000_create_index_entries.sql   # index_entries table + RLS
    20260620120000_create_user_tabs.sql       # user_tabs table + RLS
```

## Saved tab sync (`user_tabs`)

When a tab has `savedLocation !== 'none'` and the user is authenticated, `useTabs` debounces upserts to Supabase `user_tabs` (id, name, saved_location, saved_folder_id, card_ids). Tab_card order and fold state remain local-only.

## Supabase client

`src/lib/supabaseClient.js` — singleton, reads from `.env`:

```js
const url = import.meta.env.VITE_SUPABASE_URL ?? 'https://placeholder.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? 'placeholder-key'
export const supabase = createClient(url, key)
```

Placeholder values prevent the import from throwing in test environments. Tests mock this module via `vi.mock('./lib/supabaseClient', ...)`.

## Remote card shape (Supabase `cards` table)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Matches local `card.id` |
| `user_id` | uuid | Supabase auth user id; enforced by RLS |
| `type` | text | `'text'` or `'portal'` |
| `subtype` | text | `null` |
| `title` | text | Empty string for portal cards |
| `body` | jsonb | `{ kind: 'plain', text: '...' }` |
| `config` | jsonb | `{}` for text cards; `{ target_card_id: string }` for portal cards |
| `location` | text | `'none' \| 'shelf' \| 'library'` — CHECK constraint |
| `content_hash` | text | FNV-1a hex of `{ body, config }` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

## Pure logic — cardSyncLogic.js

### `computeContentHash(card)`

FNV-1a 32-bit hash over `JSON.stringify({ body: card.body ?? '', config: card.config ?? {} })`.

### `classifyCardSync(localCard, remoteCard)`

| State | Condition |
|---|---|
| `'LOCAL_ONLY'` | `remoteCard` is null/undefined |
| `'REMOTE_ONLY'` | `localCard` is null/undefined |
| `'IN_SYNC'` | Timestamps equal AND content hashes match |
| `'LOCAL_NEWER'` | `localCard.updatedAt >= remoteTs` (after in-sync check) |
| `'REMOTE_NEWER'` | `remoteTs > localCard.updatedAt` |

`localCard.updatedAt` is ms epoch; `remoteCard.updated_at` is ISO 8601 — converted via `new Date(...).getTime()`.

### `resolveCardConflict(localCard, remoteCard)`

| Classification | Action | Winner |
|---|---|---|
| `LOCAL_ONLY` | `PUSH_LOCAL` | `'local'` |
| `REMOTE_ONLY` | `PULL_REMOTE` | `'remote'` |
| `IN_SYNC` | `NOOP` | `null` |
| `LOCAL_NEWER` | `PUSH_LOCAL` | `'local'` |
| `REMOTE_NEWER` | `PULL_REMOTE` | `'remote'` |

`REMOTE_NEWER` defaults to `PULL_REMOTE` — no conflict UI yet.

## Supabase storage adapter — cardSupabaseStorage.js

Factory function. Never imports `supabase` directly — client is always injected.

```js
export function makeCardSupabaseStorage(client) {
  // returns { fetchRemoteCardsForUser, upsertRemoteCard, fetchRemoteCardById, deleteRemoteCard }
}
```

| Method | Behaviour |
|---|---|
| `fetchRemoteCardsForUser(userId)` | `SELECT *` WHERE `user_id = userId` |
| `upsertRemoteCard(cardRow)` | UPSERT on conflict `(id)` |
| `fetchRemoteCardById(userId, cardId)` | Single-row SELECT; returns `null` if not found |
| `deleteRemoteCard(cardId)` | `DELETE` WHERE `id = cardId` |

## Sync orchestration — cardSync.js

### `syncDirtyCardsForUser(userId, storage)`

Processes locally-dirty cards only. For each dirty card:
1. Compute content hash
2. Fetch remote row by card id
3. `resolveCardConflict` → action
4. Execute: `NOOP` → `markCardClean`; `PUSH_LOCAL` → `upsertRemoteCard` then `markCardClean`; `PULL_REMOTE` → `markCardClean` with remote shape
5. Per-card error catch — failure leaves card dirty and logs to console; does not abort batch.

### `pullRemoteCardsForUser(userId, storage)` → `string[]`

Fetches all remote cards and reconciles into Dexie:
- No local copy → write to Dexie (`dirty: false`), add id to result
- Local is dirty → skip (local changes take priority)
- Remote is newer and local is clean → overwrite local
- Local is newer → leave unchanged

Returns new card ids (brand-new to this device). `useTabs` uses this to create `tab_card` entries.

### `createCardSyncScheduler({ userId, debounceMs, storage })`

Returns `{ scheduleSync, runNow }`.

| Method | When | What |
|---|---|---|
| `scheduleSync()` | After any card mutation | Debounced `syncDirtyCardsForUser`. Push-only. |
| `runNow()` | On initial authenticated load | Cancels pending debounce, calls pull → sync in sequence. |

## Dock Prompt — AI card creation

See [prompt.md](prompt.md) for full detail on `assembleContext`, `buildPrompt`, the edge function, `runDockPrompt`, and the `DockPrompt` UI component.

## Wiki Index — AI knowledge indexing

See [brain.md](./brain.md) for `indexCard`, `finishIndexResult`, library-only rules, CardBack display, and Brain feed. See [debug.md](./debug.md) for pipeline tracing.

## Auth (App.jsx)

`App` owns session state:
- Renders `null` while `sessionChecked` is false
- Renders `<AuthForm>` when `userId` is null
- Renders `<AppShell userId={userId}>` when authenticated

Auth state is kept live via `supabase.auth.getSession()` + `onAuthStateChange`.

Sign-up shows a "Check your email" confirmation; sign-in logs in immediately on valid credentials.

## Tests

| File | What it covers |
|---|---|
| `cardSyncLogic.test.js` | `computeContentHash` (deterministic, body-only, config included), `classifyCardSync` (all 5 states, timestamp edges), `resolveCardConflict` (all 5 → correct action/winner) |
| `cardSupabaseStorage.test.js` | `fetchRemoteCardsForUser`, `upsertRemoteCard`, `fetchRemoteCardById`, `deleteRemoteCard` via fake client chains |
| `cardSync.test.js` | `syncDirtyCardsForUser` (push local-only, push local-newer, pull remote-newer, NOOP in-sync, error leaves dirty, skips clean); `pullRemoteCardsForUser` (writes new remote, overwrites clean local when newer, skips dirty local, skips when local newer, empty → []); scheduler (debounce, runNow pull+sync, runNow cancels pending debounce) |
| `assembleContext.test.js` | Empty, maps to {id,title,body}, excludes hidden, includes folded, preserves order, all-hidden |
| `buildPrompt.test.js` | Two-element array, system plain-text instruction, user message contains prompt, card titles/bodies, placeholder when no cards, untitled → "Card N", dividers between multiple cards |
| `useTabs.test.js` (sync subset) | Scheduler created with userId, not without; runNow on initial reconcile; scheduleSync on mutations; orphan card detection; removeCard with userId calls deleteRemoteCard; runDockPrompt (invoke args, card created, returns true/false, hidden cards excluded) |
| `App.test.jsx` | Auth gate; Prompt button; DockPrompt open/close/submit |

## Not built yet

- Conflict UI (currently `REMOTE_NEWER` always wins)
- Tab_card or folder sync to Supabase (saved tab metadata syncs via `user_tabs`)
- Optimistic rollback on sync failure
- Real-time Supabase subscriptions
- Streaming dock-prompt responses
- Job queue, credits, cost estimation
- Model picker or per-user model preference
- `folderId` sync
