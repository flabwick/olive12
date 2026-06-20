# olive12 — primary agent

React + Vite personal knowledge vault. Cards live on tabs; you promote them through **Shelf** (staging) to **Library** (organised, wiki-indexed). Supabase handles auth, card sync, and OpenRouter edge functions for AI features.

## Run locally

```bash
npm install
cp .env.example .env   # or use existing .env with VITE_SUPABASE_* keys
npm run dev            # default port from .env PORT (6961)
npm run test           # Vitest unit tests
npm run storybook      # component stories on :6006
```

Requires Supabase project with migrations applied and edge functions deployed (`dock-prompt`, `wiki-index`). See [docs/build/supabase-setup.md](./docs/build/supabase-setup.md).

## Architecture (current)

```
Tab (working surface)
  └─ text cards + portal cards (flip → back face with notes + wiki index when library)

Shelf (location: shelf)     → chronological staging, no wiki index
Library (location: library) → folder tree + wiki index entries (OpenRouter)

Dock: + card | Folders | Prompt | Idx debug | Tab overview
FolderPanel: Shelf | Library | Brain feed
```

## Documentation map

| Doc | Topic |
|---|---|
| [AGENTS.md](./AGENTS.md) | How to build slices (testing, file discipline) |
| [docs/build/cards.md](./docs/build/cards.md) | Card model, flip/back face, CardHeader, PortalCard |
| [docs/build/tabs.md](./docs/build/tabs.md) | useTabs hook, Tab, Dock, DockPrompt, App shell |
| [docs/build/brain.md](./docs/build/brain.md) | Wiki index, indexCard, library-only indexing, Brain feed |
| [docs/build/debug.md](./docs/build/debug.md) | Index pipeline debug panel and event log |
| [docs/build/storage.md](./docs/build/storage.md) | Dexie schema (v6), per-table storage |
| [docs/build/sync.md](./docs/build/sync.md) | Card Supabase sync, dock-prompt |
| [docs/build/links.md](./docs/build/links.md) | Directed link graph (portal + embed) |
| [docs/build/vault.md](./docs/build/vault.md) | FolderPanel, ShelfRow, FolderTree |
| [docs/build/prompt.md](./docs/build/prompt.md) | Dock prompt → OpenRouter → new card |
| [docs/dockPrompt.md](./docs/dockPrompt.md) | Dock prompt design notes |
| [docs/pre-planning/design.md](./docs/pre-planning/design.md) | Full-system design intent (not all built) |
| [docs/pre-planning/olive12.md](./docs/pre-planning/olive12.md) | Product vision |

## What is built (primary, as of this branch)

- Auth gate + Dexie-local-first cards/tabs/folders/links/index_entries
- Card inline edit, fold/hide/reorder, location promotion (+ shelf → ✓ library)
- Portal cards after save-to-shelf; locate-in-vault button
- Card flip (≡ header control): back face with notes, metadata, wiki index (library only)
- Wiki indexing on `moveToLibrary` via `wiki-index` edge function + body fallback when LLM summary empty
- Index pipeline debug (Idx button in Dock + inline debug on card back)
- Brain feed UI (stale/orphan flags); accept action is stub
- Tab Supabase sync for saved tabs (`user_tabs` table)
- Dock prompt AI card creation

## What is not built yet

See each feature doc's **Not built yet** section. Highlights: tab/card Dexie sync, Brain accept → re-index, embeddings, rich text, E2E for wiki-index.
