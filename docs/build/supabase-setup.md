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

## Sync flow

1. On authenticated load, `useTabs` calls `runNow()`:
   - **Pulls** all remote cards into Dexie (skips dirty locals, skips when local is newer)
   - **Detects orphan cards** — cards in Dexie `cards` with no `tab_cards` entry (arrived from another device) — and auto-creates `tab_cards` so they appear in the tab feed
   - **Pushes** dirty local cards to Supabase
2. After each mutation (`addCard`, `updateCard`, `saveToShelf`, `moveToLibrary`), a debounced push fires after 3 seconds of inactivity.

## What syncs (and what doesn't)

| Data | Syncs to Supabase |
|---|---|
| Card `title`, `body`, `location` | Yes — debounced 3 s after mutation |
| Card `folderId` | No — local only |
| Tabs, tab order, `foldState`, `hiddenState` | No — Dexie only |
| Folders | No — Dexie only |

## `@supabase/supabase-client-react-router`

This shadcn registry item is not applicable — olive12 does not use React Router. The `useEffect`-based auth wiring in `App.jsx` is the equivalent for a plain React app.
