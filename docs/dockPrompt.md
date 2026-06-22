# Dock Prompt — implementation

This document describes the dock-prompt slice: a streaming AI loop accessible from the Dock that sends the active tab's visible cards as context and creates (then streams into) a new card from the response.

For the Dock UI and `useTabs` hook this extends, see [tabs.md](./build/tabs.md). For Supabase setup and the `OPENROUTER_API_KEY` secret, see [build/supabase-setup.md](./build/supabase-setup.md). For card storage, see [build/storage.md](./build/storage.md).

## What this slice adds

1. A **`DockPrompt`** component: a textarea + Send/Cancel buttons + inline error display.
2. A **`dock-prompt` Supabase Edge Function** that receives `{ prompt, contextCards }`, calls OpenRouter with streaming enabled, and sends SSE chunks back.
3. **`assembleContext`** — pure function that filters the current tab's entries to only visible (non-hidden) cards.
4. **`buildPrompt`** — pure function that constructs the OpenRouter messages array.
5. **`parseDockPromptContent`** — pure function that parses the plain-text model response into `{ title, body }`.
6. **`streamParser.parseStreamChunk`** — pure function that extracts a delta string from an SSE `data:` line.
7. **`runDockPrompt(promptText)`** in `useTabs` — assembles context, creates an empty card immediately, opens an SSE stream, and updates the card incrementally as chunks arrive.

## File map

```
src/
  prompt/
    assembleContext.js          # Pure: filters entries to visible contextCards
    assembleContext.test.js     # [TEST] 6 unit tests
    buildPrompt.js              # Pure: builds OpenRouter messages array
    buildPrompt.test.js         # [TEST] 7 unit tests
    parseDockPromptContent.js   # Pure: title/body from first-line format
    parseDockPromptContent.test.js # [TEST]
    streamParser.js             # Pure: SSE line → delta string | null
    streamParser.test.js        # [TEST]
    DockPrompt.jsx              # Dumb component: textarea + send + error
    DockPrompt.css
    DockPrompt.test.jsx         # [TEST] 9 tests
    DockPrompt.stories.jsx      # [STORY] Default, Loading, WithError
  tab/
    Dock.jsx                    # 2-state toolbar; lightning button (AI prompt) — not yet wired to DockPrompt
    useTabs.js                  # runDockPrompt, promptLoading, promptError
    useTabs.test.js             # runDockPrompt tests
  App.jsx                       # AppShell: promptOpen state, DockPrompt render, handlePromptSubmit
  App.test.jsx                  # Prompt wiring tests
supabase/
  functions/
    dock-prompt/
      index.ts                  # Deno Edge Function: OpenRouter SSE streaming
```

## Context assembly

`assembleContext(entries)` — excludes hidden cards (`hiddenState: true`), includes folded cards. Returns `[{ id, title, body }]` in position order.

## Prompt construction

`buildPrompt(prompt, contextCards)` returns a two-element messages array:

- **System message:** instructs the model to write a short title on line 1, leave a blank line, then write the full response as plain text (no JSON, no markdown).
- **User message:** context cards formatted as titled blocks with `---` dividers, followed by the user's prompt.

Mirrored inline in the edge function — keep both in sync if wording changes.

## Response parsing

`parseDockPromptContent(content)` — client-side parser for the accumulated plain-text response:

- Title = line 1 (max 80 chars; falls back to `'Response'` if blank or too long).
- Body = everything after line 1 (blank lines between title and body are skipped).
- Edge case: if the model skips the format and opens with a long paragraph, title becomes `'Response'` and body is the full text.

`parseStreamChunk(line)` — parses a single `data:` SSE line. Returns the `choices[0].delta.content` string, or `null` for `[DONE]`, non-data lines, or parse errors.

## Edge Function — dock-prompt

**Deploy:**
```bash
supabase secrets set OPENROUTER_API_KEY=<key>
supabase functions deploy dock-prompt
```

**Request:** `{ "prompt": "string", "contextCards": [{ "id": "...", "title": "...", "body": "..." }] }`

**Response:** SSE stream (`text/event-stream`). Each `data:` line is an OpenRouter chunk with `choices[0].delta.content`. Final `data: [DONE]` line signals end of stream.

**Model config** (top of `index.ts`):
```ts
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.7,
  maxTokens: 2000,
}
```

To change model: edit `MODEL_CONFIG.model` and redeploy.

## Hook — `runDockPrompt` in useTabs

Streaming flow:

1. Assembles context from visible tab entries.
2. Creates an empty card immediately (appears in tab at once).
3. Uses `fetch` directly (not `supabase.functions.invoke`) to open the SSE stream.
4. Reads stream via `ReadableStream.getReader()`. For each chunk, calls `parseStreamChunk` on each `data:` line.
5. On first `\n` in accumulated text: extracts title, sets it on the card.
6. Subsequent chunks update the body via `requestAnimationFrame` batching.
7. On stream end: applies final `parseDockPromptContent` result; falls back to JSON parse if no SSE deltas received.
8. Each card update calls `putCard` and `schedulerRef.current?.scheduleSync()`.

Returns `true` on success, `false` on error. `promptLoading` and `promptError` exposed from `useTabs`.

## App wiring

`AppShell` owns `promptOpen` state. `handlePromptSubmit` calls `runDockPrompt` and closes the panel on success (for non-streaming callers — in streaming mode the card is already visible and the panel is closed after the stream ends).

**Current status:** The Dock's lightning button (in DOCK_EDITOR and TAB_EDITOR states) toggles `lightningActive` for visual feedback but is **not yet wired to `setPromptOpen`**. The DockPrompt panel is not currently reachable from the UI.

## Tests

| File | What it covers |
|---|---|
| `assembleContext.test.js` | Empty, maps to {id,title,body}, excludes hidden, includes folded, preserves order, all-hidden |
| `buildPrompt.test.js` | Two-element array, system message (plain-text), user message contains prompt, card titles/bodies, placeholder, untitled → "Card N", dividers |
| `parseDockPromptContent.test.js` | Normal title+body; single line; body-only (title too long); blank response; title-only |
| `streamParser.test.js` | Returns delta; null for [DONE]; null for non-data; null for parse errors |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; onSubmit with trimmed text; onDismiss; whitespace-only no-op; loading state; error alert present/absent |
| `useTabs.test.js` | Creates card; streaming updates; returns true on success; sets promptError/returns false on error; excludes hidden cards |
| `App.test.jsx` | Prompt panel wiring |

## Not built yet

- Lightning button → DockPrompt panel wiring
- Streaming cancel / abort controller
- Approve/deny UI before the card is committed
- Editing existing cards via AI
- Job queue, credits, cost estimation
- Model picker or per-user model preference
- Prompt history / replay
- Multi-provider abstraction beyond OpenRouter
