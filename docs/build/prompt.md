# Prompt — implementation

AI card creation via the Dock Prompt UI: context assembly, prompt building, the Supabase Edge Function calling OpenRouter, and the `runDockPrompt` orchestration in `useTabs`.

## File map

```
src/
  prompt/
    assembleContext.js        # Pure: filters tab entries to visible contextCards
    assembleContext.test.js   # [TEST] 6 tests
    buildPrompt.js            # Pure: builds OpenRouter messages array
    buildPrompt.test.js       # [TEST] 7 tests
    DockPrompt.jsx            # Dumb: prompt textarea + send + cancel + error
    DockPrompt.css
    DockPrompt.test.jsx       # [TEST] 9 tests
    DockPrompt.stories.jsx    # [STORY]
  tab/
    Dock.jsx                  # 3-state toolbar — lightning button (AI prompt toggle, not yet wired to DockPrompt)
    useTabs.js                # runDockPrompt, promptLoading, promptError live here
supabase/
  functions/
    dock-prompt/
      index.ts                # Deno Edge Function: OpenRouter call → { title, body }
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

**Why plain text, not JSON:** Small models (including llama-3.2-3b via Cloudflare Workers AI) enter tool-call mode when asked for JSON output. The model returns `finish_reason: "tool_calls"` with `content: null`, producing empty cards. The plain-text format with title-on-first-line avoids this entirely.

## Edge Function — `supabase/functions/dock-prompt/index.ts`

### Model config

```ts
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.7,
  maxTokens: 2000,
}
```

This is the only place model selection lives. Change it here and redeploy; nowhere else needs updating.

### Request / response

Request body (from client): `{ prompt: string, contextCards: [{ id, title, body }] }`

Response body (to client): `{ title: string, body: string, _debug: { finishReason, rawContent } }`

Error responses: `{ error: string, detail?: string }` at status 400, 500, or 502.

### `parseContent(content)`

Splits the model's plain-text response on the first `\n`:

```ts
function parseContent(content: string): { title: string; body: string } {
  const trimmed = content.trim()
  const firstNewline = trimmed.indexOf('\n')
  if (firstNewline < 0) {
    return { title: trimmed || 'Response', body: trimmed }
  }
  const title = trimmed.slice(0, firstNewline).trim() || 'Response'
  const body = trimmed.slice(firstNewline + 1).trim()
  return { title, body: body || trimmed }
}
```

- Title = everything before the first `\n` (falls back to `'Response'` if blank)
- Body = everything after the first `\n` (falls back to full content if blank)
- No JSON parsing — the model is not asked for JSON

### OpenRouter call

Uses `fetch` directly (Deno). Headers: `Authorization: Bearer <OPENROUTER_API_KEY>`, `Content-Type: application/json`. The API key is read from `Deno.env.get('OPENROUTER_API_KEY')` — set it with `supabase secrets set OPENROUTER_API_KEY=<key>`.

If `openRouterRes.ok` is false, returns 502 with `{ error, detail }`. If the body is missing or the API key is absent, returns 400 or 500 respectively. All responses include CORS headers (`Access-Control-Allow-Origin: *`). OPTIONS preflight returns 200 immediately.

### Deploying

```bash
supabase secrets set OPENROUTER_API_KEY=<your-key>
supabase functions deploy dock-prompt
```

## Hook — `runDockPrompt` in useTabs

`runDockPrompt(promptText)` is a `useCallback` declared **after** the `entries`, `shelfEntries`, and `libraryEntries` computed values (it references `entries` in its dependency array — placing it before `entries` would cause a temporal dead zone error).

```js
const runDockPrompt = useCallback(
  async (promptText) => {
    setPromptLoading(true)
    setPromptError('')
    try {
      const contextCards = assembleContext(entries)
      const { data, error } = await supabase.functions.invoke('dock-prompt', {
        body: { prompt: promptText, contextCards },
      })
      if (error) throw error
      await addCard({ title: data?.title ?? '', body: data?.body ?? '' })
      setPromptLoading(false)
      return true
    } catch (err) {
      setPromptError(err.message || 'Something went wrong')
      setPromptLoading(false)
      return false
    }
  },
  [entries, addCard],
)
```

Returns `true` on success (causes `AppShell` to close the `DockPrompt`), `false` on error (keeps it open, shows error). `promptLoading` and `promptError` are exposed from `useTabs` return value.

## UI — DockPrompt component

`DockPrompt({ onSubmit, onDismiss, loading = false, error = '' })` — dumb component, no internal async logic.

- Textarea for the prompt text; starts empty on each open.
- **Send** button: disabled when textarea is empty or `loading` is true. On submit, trims the text and calls `onSubmit(trimmedText)`. Whitespace-only input is a no-op.
- **Cancel** button: calls `onDismiss`.
- Error string displayed with `role="alert"` when non-empty.
- Visual state: panel slides up above the Dock, same slot as `FolderPanel` (mutually exclusive — opening one closes the other in `AppShell`).

## AppShell wiring

```js
async function handlePromptSubmit(text) {
  const ok = await runDockPrompt(text)
  if (ok) setPromptOpen(false)
}
```

`AppShell` owns `promptOpen` state and renders `<DockPrompt>` above the dock when true. The `DockPrompt` UI and `runDockPrompt` hook logic are fully functional.

**Current status:** The Dock's lightning bolt button (rendered in DOCK_EDITOR and TAB_EDITOR states as "AI prompt") toggles a `lightningActive` display state, but is not yet wired to `setPromptOpen`. The `promptOpen` panel is not yet openable from the UI — this wiring is part of the AI prompt UX slice (not yet built). The `DockPrompt` component, edge function, and `runDockPrompt` remain ready for when that wiring lands.

## Tests

| File | What it covers |
|---|---|
| `assembleContext.test.js` | Empty entries → []; maps to {id,title,body}; excludes hidden cards; includes folded cards; preserves position order; all-hidden → [] |
| `buildPrompt.test.js` | Two-element array; system message instructs plain-text / title-on-first-line (not JSON); user message contains prompt; card titles and bodies; placeholder when no cards; untitled card → "Card N"; dividers between multiple cards |
| `DockPrompt.test.jsx` | Renders textarea + buttons; Send disabled when empty; enables after typing; onSubmit with trimmed text; onDismiss; whitespace-only is no-op; loading disables Send; error alert present/absent |
| `useTabs.test.js` (runDockPrompt) | Invokes edge function with correct prompt and contextCards; creates card from response title/body; returns true on success; sets promptError and returns false on invoke error; excludes hidden cards from contextCards |
| `App.test.jsx` | Prompt button in Dock; DockPrompt opens on click; DockPrompt closes after successful submit; DockPrompt stays open on error |

## Not built yet

- Lightning button → DockPrompt panel wiring (button exists; panel and logic are ready but not yet connected)
- Approve/deny UI before the card is created
- Streaming responses (currently waits for full completion)
- Job queue, credits, cost estimation
- Model picker or per-user model preference
- Context scoping (currently uses all visible cards; no per-card opt-in)
- Editing existing cards via AI (currently only creates new cards)
