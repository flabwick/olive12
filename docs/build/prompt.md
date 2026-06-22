# Prompt — implementation

AI card creation via the Dock Prompt UI: context assembly, prompt building, the Supabase Edge Function calling OpenRouter with streaming SSE, and the `runDockPrompt` orchestration in `useTabs`.

## File map

```
src/
  prompt/
    assembleContext.js          # Pure: filters tab entries to visible contextCards
    assembleContext.test.js     # [TEST] 6 tests
    buildPrompt.js              # Pure: builds OpenRouter messages array
    buildPrompt.test.js         # [TEST] 7 tests
    parseDockPromptContent.js   # Pure: parse title/body from model plain-text response
    parseDockPromptContent.test.js # [TEST]
    streamParser.js             # Pure: parse SSE line → delta string | null
    streamParser.test.js        # [TEST]
    DockPrompt.jsx              # Dumb: prompt textarea + send + cancel + error
    DockPrompt.css
    DockPrompt.test.jsx         # [TEST] 9 tests
    DockPrompt.stories.jsx      # [STORY]
  tab/
    Dock.jsx                    # 2-state toolbar — lightning button (AI prompt toggle, not yet wired to DockPrompt)
    useTabs.js                  # runDockPrompt, promptLoading, promptError live here
supabase/
  functions/
    dock-prompt/
      index.ts                  # Deno Edge Function: OpenRouter SSE streaming call
```

## Flow

```
User types prompt → DockPrompt.onSubmit
  → AppShell.handlePromptSubmit
    → useTabs.runDockPrompt(promptText)
      → assembleContext(entries)         # filter hidden cards
      → supabase.functions.invoke(       # call edge function
          'dock-prompt',
          { prompt, contextCards }
        )
        → OpenRouter (llama-3.2-3b)
        ← { title, body }
      → addCard({ title, body })         # card appears in tab
      ← true (closes DockPrompt)
```

## Pure logic

### `assembleContext(entries)` → `contextCard[]`

Takes the `entries` array from `useTabs` (each entry is `{ card, position, foldState, hiddenState }`). Returns `[{ id, title, body }]` for every non-hidden card, in position order.

- Hidden cards (`hiddenState: true`) are excluded — they are opted out of AI context.
- Folded cards (`foldState: true`) are **included** — folding is a display affordance, not a context exclusion.

### `buildPrompt(prompt, contextCards)` → `messages[]`

Builds the OpenRouter chat completions messages array. **Mirrored inside the edge function** — keep both in sync if the wording changes.

Returns two messages:

```js
[
  {
    role: 'system',
    content: 'You are an AI assistant embedded in a note-taking app. Write a short title on the first line (max 80 characters). Leave one blank line. Then write your full response as plain text. No JSON, no markdown, no labels — just the title, a blank line, then the content.',
  },
  {
    role: 'user',
    content: `Context cards:\n\n${contextBlock}\n\n---\n\nPrompt: ${prompt}`,
  },
]
```

Context cards are formatted as bold headings + body, separated by `---` dividers. Cards with no title use `Card N` as the heading. Empty card list renders `(no cards in the current tab)`.

**Why plain text, not JSON:** Small models (including llama-3.2-3b) enter tool-call mode when asked for JSON output, returning `content: null`. The plain-text format with title-on-first-line avoids this entirely.

### `parseDockPromptContent(content)` — `src/prompt/parseDockPromptContent.js`

Client-side parser for the model's plain-text response. Mirrored in the edge function.

- Title = line 1 only (trimmed, max 80 chars). Falls back to `'Response'` if blank or line is too long.
- Body = everything after line 1 (blank lines between title and body are skipped).
- Handles edge cases: single-line response, model that skips the title format and starts with a long paragraph.

### `parseStreamChunk(line)` — `src/prompt/streamParser.js`

Parses a single SSE `data:` line from the OpenRouter streaming API. Returns the delta content string, or `null` for non-content lines (`[DONE]`, non-data lines, parse errors).

## Edge Function — `supabase/functions/dock-prompt/index.ts`

### Model config

```ts
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.7,
  maxTokens: 2000,
}
```

This is the only place model selection lives. Change it here and redeploy.

### Request / response

Request body (from client): `{ prompt: string, contextCards: [{ id, title, body }] }`

The function streams SSE back to the client (`text/event-stream`). Each data line contains an OpenRouter chunk with `choices[0].delta.content`. The client uses `parseStreamChunk` to accumulate these into the final title+body.

Error responses: `{ error: string, detail?: string }` at status 400, 500, or 502. All responses include CORS headers.

### Deploying

```bash
supabase secrets set OPENROUTER_API_KEY=<your-key>
supabase functions deploy dock-prompt
```

## Hook — `runDockPrompt` in useTabs

`runDockPrompt(promptText)` uses raw `fetch` (not `supabase.functions.invoke`) for streaming. Flow:

1. Creates an empty card immediately so it appears in the tab at once.
2. Opens SSE stream from `dock-prompt`.
3. Accumulates delta text via `parseStreamChunk`; once first `\n` is found, extracts title and sets it.
4. Subsequent deltas update the body in batches via `requestAnimationFrame`.
5. On stream end, applies final title+body (via `parseDockPromptContent` logic inline).
6. Falls back to JSON parsing if no SSE deltas were received (legacy function format).

Returns `true` on success, `false` on error. `promptLoading` and `promptError` are exposed from `useTabs`.

## UI — DockPrompt component

`DockPrompt({ onSubmit, onDismiss, loading = false, error = '' })` — dumb component, no internal async logic.

- Textarea for the prompt text; starts empty on each open.
- **Send** button: disabled when textarea is empty or `loading`. Trims and calls `onSubmit(trimmedText)`. Whitespace-only is a no-op.
- **Cancel** button: calls `onDismiss`.
- Error displayed with `role="alert"` when non-empty.
- Rendered by `AppShell` when `promptOpen` is true (same slot as `FolderPanel`, mutually exclusive).

## AppShell wiring

`AppShell` owns `promptOpen` state. `handlePromptSubmit(text)` calls `runDockPrompt` and closes the panel on success.

**Current status:** The Dock's lightning button (in DOCK_EDITOR and TAB_EDITOR states) toggles `lightningActive` for visual feedback, but is **not yet wired to `setPromptOpen`**. The `promptOpen` panel is not yet openable from the UI — that wiring is a separate slice.

## Tests

| File | What it covers |
|---|---|
| `assembleContext.test.js` | Empty entries → []; maps to {id,title,body}; excludes hidden; includes folded; preserves order; all-hidden → [] |
| `buildPrompt.test.js` | Two-element array; system message (plain-text instruction); user message contains prompt; card titles/bodies; placeholder when no cards; untitled → "Card N"; dividers between multiple cards |
| `parseDockPromptContent.test.js` | Normal title+body; single line; body-only (title too long); blank → Response; title-only response |
| `streamParser.test.js` | Returns delta content; null for [DONE]; null for non-data lines; null for parse errors |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; onSubmit with trimmed text; onDismiss; whitespace-only no-op; loading state; error alert present/absent |
| `useTabs.test.js` (runDockPrompt) | Creates card; streaming updates card; returns true on success; sets promptError and returns false on error; excludes hidden cards |
| `App.test.jsx` | Prompt panel wiring (when opened) |

## Not built yet

- Lightning button → DockPrompt panel wiring (button exists; panel and logic ready)
- Approve/deny UI before the card is created
- Streaming cancel / abort
- Job queue, credits, cost estimation
- Model picker or per-user model preference
- Context scoping (currently all visible cards; no per-card opt-in)
- Editing existing cards via AI
