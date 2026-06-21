# Dock Prompt — implementation

This document describes the dock-prompt slice: a one-shot AI loop accessible from the Dock that sends the active tab's visible cards as context and creates a new card from the response.

For the Dock UI and `useTabs` hook this extends, see [tabs.md](./tabs.md). For Supabase setup and the `OPENROUTER_API_KEY` secret, see [supabase-setup.md](./supabase-setup.md). For card storage, see [storage.md](./storage.md).

## What this slice adds

1. A **Prompt** button in the Dock's left group. Clicking it opens the `DockPrompt` form above the Dock (same positioning slot as `FolderPanel`).
2. A **`DockPrompt`** component: a textarea + Send/Cancel buttons + inline error display.
3. A **`dock-prompt` Supabase Edge Function** that receives `{ prompt, contextCards }`, calls OpenRouter, and returns `{ title, body }` for a new card.
4. **`assembleContext`** — pure function that filters the current tab's entries to only visible (non-hidden) cards and returns `[{ id, title, body }]`.
5. **`buildPrompt`** — pure function that constructs the OpenRouter messages array from a prompt string and context cards.
6. **`runDockPrompt(promptText)`** in `useTabs` — assembles context, invokes the edge function, and creates a new card on success. Exposes `promptLoading` and `promptError` state.

## File map

```
src/
  prompt/
    assembleContext.js          # Pure: filters entries to visible contextCards
    assembleContext.test.js     # [TEST] 6 unit tests
    buildPrompt.js              # Pure: builds OpenRouter messages array
    buildPrompt.test.js         # [TEST] 7 unit tests
    DockPrompt.jsx              # Dumb component: textarea + send + error
    DockPrompt.css
    DockPrompt.test.jsx         # [TEST] 9 tests
    DockPrompt.stories.jsx      # [STORY] Default, Loading, WithError
  tab/
    Dock.jsx                    # 3-state toolbar; lightning button (AI prompt) exists but not yet wired to DockPrompt
    useTabs.js                  # runDockPrompt, promptLoading, promptError
    useTabs.test.js             # 5 runDockPrompt tests
  App.jsx                       # AppShell: promptOpen state, DockPrompt render, handlePromptSubmit
  App.test.jsx                  # Prompt wiring tests
supabase/
  functions/
    dock-prompt/
      index.ts                  # Deno Edge Function: OpenRouter call → { title, body }
```

## Context assembly

`assembleContext(entries)` takes the `entries` array from `useTabs` and returns cards eligible for LLM context:

- **Hidden cards excluded** (`hiddenState: true`) — the user's explicit "out of sight" toggle.
- **Folded cards included** — folding is a display affordance, not a content exclusion.
- Output: `[{ id, title, body }]` in the same order as the input array (position order).

## Prompt construction

`buildPrompt(prompt, contextCards)` returns a two-element messages array for the OpenRouter chat completions API:

- System message: instructs the model to respond with a single JSON object `{ "title": "...", "body": "..." }` — no markdown fences, no explanation.
- User message: the context cards formatted as titled blocks separated by `---` dividers, followed by the user's prompt.

This function is mirrored inline in `supabase/functions/dock-prompt/index.ts`. If the prompt wording changes, update both.

## Edge Function — dock-prompt

**Deploy command** (run by the human outside this session):
```bash
supabase functions deploy dock-prompt
```

**Prerequisites:**
- `OPENROUTER_API_KEY` secret set: `supabase secrets set OPENROUTER_API_KEY=<key>`
- Supabase CLI linked to the project

**Request shape:**
```json
{ "prompt": "string", "contextCards": [{ "id": "...", "title": "...", "body": "..." }] }
```

**Response shape on success:**
```json
{ "title": "string", "body": "string" }
```

**Error shape:**
```json
{ "error": "string", "detail": "optional string" }
```

**Model config** (top of `index.ts`, the only place model selection lives):
```ts
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.7,
  maxTokens: 2000,
}
```

To change models: edit `MODEL_CONFIG.model` and run `supabase functions deploy dock-prompt`. No UI, no database config, no per-user setting.

If the model returns non-JSON, the function falls back to `{ title: 'Response', body: <raw content> }` so the caller always gets a usable card.

## Hook additions — useTabs

Three new return values from `useTabs({ userId })`:

| Property | Type | Description |
|---|---|---|
| `runDockPrompt` | `async (promptText: string) → boolean` | Assembles context, invokes `dock-prompt`, calls `addCard` on success. Returns `true` on success, `false` on error. |
| `promptLoading` | `boolean` | `true` while the edge function call is in flight |
| `promptError` | `string` | Error message from the last failed call; `''` when no error |

`runDockPrompt` clears `promptError` at the start of each call. It does not clear `promptLoading` while `addCard` is writing to Dexie — the loading state covers the whole operation.

## App wiring

`AppShell` owns `promptOpen` state. When `promptOpen` is true, `<DockPrompt>` is rendered above the dock. `handlePromptSubmit` calls `runDockPrompt` and closes the panel on success.

The Dock's lightning bolt button (visible in DOCK_EDITOR and TAB_EDITOR states) toggles `lightningActive` for visual feedback, but is **not yet wired to `setPromptOpen`**. The DockPrompt panel is currently unreachable from the UI — that wiring is part of the AI prompt UX slice (not yet built).

## Tests

| File | What it covers |
|---|---|
| `assembleContext.test.js` | Empty, maps to {id,title,body}, excludes hidden, includes folded, preserves order, all-hidden |
| `buildPrompt.test.js` | Two-element array, system message contains JSON instruction, user message contains prompt, context card titles/bodies included, placeholder when no cards, untitled cards use "Card N", multiple cards separated by dividers |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; onSubmit called with trimmed text; onDismiss called; whitespace-only input doesn't fire onSubmit; loading state disables inputs and changes button text; error shown with alert role; no alert when error is empty |
| `Dock.test.jsx` | Prompt button renders; onPrompt callback called; promptDisabled disables button; click does not fire when disabled |
| `useTabs.test.js` | invoke called with correct prompt+contextCards; new card created from AI response; returns true on success; sets promptError and returns false on error; hidden cards excluded from contextCards |
| `App.test.jsx` | Prompt button in dock; clicking opens DockPrompt; Cancel closes DockPrompt; submit calls invoke and creates card then closes form |

## OpenRouter dependency

- **API key**: `OPENROUTER_API_KEY` — set as a Supabase secret, never in the frontend.
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Default model**: `meta-llama/llama-3.2-3b-instruct` (set in `MODEL_CONFIG` at the top of `index.ts`)
- OpenRouter is the only external AI dependency in this slice.

## Not built yet

Explicitly out of scope — do not add without a new slice:

- Lightning button → DockPrompt panel wiring (button exists in formatting toolbar, panel and logic ready)
- Approve/deny/diff UI before the card is created
- Editing existing cards via LLM
- Streaming responses (current implementation waits for the full completion)
- Job queue, `jobs` table, Realtime, cost estimation, credits ledger
- Model picker UI or per-user model preference
- Multi-provider abstraction beyond OpenRouter
- Card links / recursive context (context is the flat visible card list only)
- Container, portal, process card context handling
- Prompt history / replay
