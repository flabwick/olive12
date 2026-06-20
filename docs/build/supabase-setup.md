# Supabase setup

## Agent Skills

Supabase agent skills are installed at `.agents/skills/supabase`. They give Claude Code ready-made Postgres best-practices. To reinstall or update:

```bash
npx skills add supabase/agent-skills
```

## Environment variables

`.env` (gitignored). Two required vars:

```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Both are in **Supabase dashboard → Project Settings → API**. The publishable key is public by design — protected by RLS, not secrecy.

> **Note:** The `password=` value in `.env` is your database password. Only needed for direct Postgres access (`supabase db push`). Never use it in the frontend.

## Creating the cards table

Migration file: `supabase/migrations/20260618000000_create_cards.sql`

**Option A — SQL Editor (quickest):**
1. Supabase project → SQL Editor
2. Paste the migration file contents and run

**Option B — Supabase CLI:**
1. `brew install supabase/tap/supabase`
2. `supabase login`
3. `supabase link --project-ref <your-project-ref>`
4. `supabase db push`

The linked GitHub repo does not auto-apply migrations. It enables database branching (preview branches per PR) but still requires `supabase db push` or the SQL editor for the initial schema.

Additional migrations in this repo:

| File | Table |
|---|---|
| `20260620000000_create_index_entries.sql` | `index_entries` — wiki index records |
| `20260620120000_create_user_tabs.sql` | `user_tabs` — saved tab metadata sync |

## Auth

Email auth is on by default in Supabase. No additional provider setup is needed.

The auth gate is built into `App.jsx`. It renders `<AuthForm>` (email + password sign-in and sign-up) when the user is not authenticated, and `<AppShell userId={userId}>` when authenticated. A successful sign-up shows a "Check your email" confirmation.

## Deploying the dock-prompt Edge Function

```bash
supabase functions deploy dock-prompt
```

The `OPENROUTER_API_KEY` secret must be set first:
```bash
supabase secrets set OPENROUTER_API_KEY=<your-openrouter-key>
```

The model is configured at the top of `supabase/functions/dock-prompt/index.ts` in `MODEL_CONFIG`. To change the model, edit that constant and redeploy. The current model is `meta-llama/llama-3.2-3b-instruct`.

The system prompt instructs the model to write a title on the first line, leave a blank line, then write the response as plain text. This format is used instead of JSON because small models (including llama-3.2-3b) enter tool-call mode when asked for JSON output, returning `null` content. The `parseContent` function in the edge function splits on the first newline to extract title and body.

## Deploying the wiki-index Edge Function

```bash
supabase functions deploy wiki-index
```

Uses the same `OPENROUTER_API_KEY` secret as dock-prompt. Invoked from `src/brain/indexCard.js` when a card is promoted to library (or on flip if no entry exists). Returns JSON `{ title, tags, summary, links }`. The edge function and client both apply a **body fallback** when the model returns an empty summary.

See [brain.md](./brain.md) and [debug.md](./debug.md) for indexing behaviour and troubleshooting.

## Sync flow

1. On authenticated load, `useTabs` calls `runNow()`:
   - **Pulls** all remote cards into Dexie (skips dirty locals, skips when local is newer)
   - **Detects orphan cards** — cards in Dexie `cards` with no `tab_cards` entry (arrived from another device) — and auto-creates `tab_cards` so they appear in the tab feed
   - **Pushes** dirty local cards to Supabase
2. After each card mutation (`addCard`, `updateCard`, `saveToShelf`, `moveToLibrary`), a debounced push fires after 3 seconds of inactivity.
3. Saved tabs (`savedLocation !== 'none'`) upsert to `user_tabs` when authenticated (see [sync.md](./sync.md)).
4. Library promotion triggers wiki-index via `indexCard` (Dexie + `index_entries` upsert, not the card debounce scheduler).

## What syncs (and what doesn't)

| Data | Syncs to Supabase |
|---|---|
| Card `title`, `body`, `location`, portal `config` | Yes — debounced 3 s after mutation |
| Card deletion | Yes — immediate on `removeCard` |
| Card `folderId`, card `back` (notes) | No — local only |
| Saved tab metadata | Yes — `user_tabs` when tab saved to shelf/library |
| Tab_card order, `foldState`, `hiddenState` | No — Dexie only |
| Folders | No — Dexie only |
| Index entries | Yes — on library index via `indexCard.js` |

## `@supabase/supabase-client-react-router`

This shadcn registry item is not applicable — olive12 does not use React Router. The `useEffect`-based auth wiring in `App.jsx` is the equivalent for a plain React app.
