# Index pipeline debug — implementation

Developer tooling for tracing wiki index creation from library promotion through OpenRouter to React render. Always available in dev builds (not gated on env flag).

For the indexing logic itself see [brain.md](./brain.md). For the card back UI see [cards.md](./cards.md).

## File map

```
src/
  debug/
    indexPipelineDebug.js       # Event log: logIndexEvent, subscribeIndexDebug, queries
    indexPipelineDebug.test.js  # [TEST]
    IndexDebugPanel.jsx         # Floating panel: filterable event list
    IndexDebugPanel.css
  tab/
    Dock.jsx                    # "Idx" toggle button (aria: Index debug)
    useTabs.js                  # Logs at moveToLibrary, flip, ensureIndex, state update
  brain/
    indexCard.js                # Logs invoke/parse/dexie/supabase stages
  card/
    CardBack.jsx                # Logs cardBack:render; inline Index debug <details>
```

## Event log API (`indexPipelineDebug.js`)

In-memory ring buffer (max 200 events). Every event is also `console.log` / `console.error` with prefix `[index-pipeline]`.

| Export | Behaviour |
|---|---|
| `logIndexEvent({ stage, cardId, status, detail, error })` | Append event; notify subscribers |
| `subscribeIndexDebug(fn)` | Calls `fn(events)` immediately and on each new event; returns unsubscribe |
| `getIndexDebugEvents()` | Snapshot of all events |
| `clearIndexDebugEvents()` | Wipe log |
| `getEventsForCard(cardId)` | Filter by card |
| `getLastErrorForCard(cardId)` | Most recent error for card |

### Stages (`INDEX_STAGES`)

| Stage | When |
|---|---|
| `moveToLibrary` | Promotion starts / errors |
| `wiki-index:invoke` | Before/after edge function call |
| `wiki-index:response` | Raw response received |
| `wiki-index:parse` | Parsed + finished result (includes `summarySource`) |
| `dexie:put` | Entry written to IndexedDB |
| `supabase:upsert` | Remote index_entries upsert (errors non-fatal) |
| `react:state` | `indexEntries` state updated |
| `dexie:reload` | Entry recovered from Dexie (e.g. after partial failure or flip enrich) |
| `flip` | Flip toggled (includes portal target id, target location) |
| `ensureIndex` | Flip-triggered index attempt (skip/error) |
| `getIndexEntry` | Lookup hit in React state |
| `cardBack:render` | Card back mounted/updated (location, hasIndexEntry, summaryPreview) |

## IndexDebugPanel

Rendered by `AppShell` when `indexDebugOpen` is true (default **open**). Toggle via **Idx** button in Dock (`aria-pressed` when active).

Features: filter box (card id / stage / error text), event count, Clear button, colour-coded rows (`ok` / `error` / `info`).

## Inline card debug

`CardBack` renders a collapsible **Index debug** block (when `cardId` is set) showing:

- `location` (wiki section only when `library`)
- `index in state` yes/no
- `indexLoading`
- `index title` / `summary` (or `empty` if entry exists but summary blank)
- Last pipeline error + stage

Auto-opens when library card has no index entry yet.

## Typical diagnosis flow

1. Promote card to library → look for `moveToLibrary start` → `wiki-index:*` → `react:state ok` with `summaryPreview`
2. Flip portal/card → `flip` should show `targetLocation: library`
3. If `react:state ok` but `summaryLen: 0` → LLM returned empty; client applies `body-fallback` (see brain.md)
4. If `ensureIndex skip` with `location=shelf` → expected; indexing is library-only
5. If `wiki-index:response error` → check edge function deploy + `OPENROUTER_API_KEY`

## Tests

| File | Covers |
|---|---|
| `indexPipelineDebug.test.js` | log/retrieve by card, last error, subscribe |

## Not built yet

- Persisting debug log across reloads
- Export to file
- Production toggle / env flag to hide panel by default
