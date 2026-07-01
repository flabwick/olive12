# AI Integration

## What it does

Lightning bolt buttons appear in four locations across the app. Clicking one transforms the dock bar into a minimal inline prompt: a tick on the left (in the same position as the bolt), a text input, and an ✕ on the right. The user optionally types instructions and confirms. The AI generates a card, streams content into it in real time, and the dock returns to its normal state.

What happens to the generated card depends on where the bolt was clicked:

- **Tab bolt / Dock BASE bolt** — a new standalone card is added to the current tab, visible immediately as an empty card that fills in as the stream arrives.
- **Formatting toolbar bolt** (while editing a card) — a new card is created and **embedded inline** within the card being edited. The embedded card appears in the editor at the cursor position before streaming starts, then fills in live. The editor keeps focus throughout.

---

## Entry points

| Location | `entryPoint` | Outcome | Default prompt (one-click, no text) |
|---|---|---|---|
| Tab header, left of Add Card | `TAB_NEW_CARD` | New standalone card in tab | "Create a useful new card that fits the theme of the existing cards in this tab." |
| Dock BASE state, leftmost | `DOCK_NEW_CARD` | New standalone card in tab | "Create a useful reference card to pin to the dock." |
| Formatting toolbar, leftmost | `DOCK_PROMPT` | Embedded card in editor | "Create a useful card to embed here." |
| CARD_SELECTED state | `DOCK_PROMPT` | Embedded card in editor | no-op without text |

The entry point is a string that travels all the way from the button click through `runAI` → `runDockPrompt` → the edge function request body. The edge function uses it to select the appropriate system message. Nothing in the pipeline hard-codes "use this prompt for this location" anywhere else.

**Lightning bolt styling:** All bolts share `.dock__lightning-btn` (amber background, gold border) regardless of which component they're in. `DockBtn` accepts a `lightning` prop that appends the class. The Tab bolt uses `.tab__ai-btn` with the same colour values.

**Formatting toolbar bolt specifically** uses `onMouseDown` + `e.preventDefault()` instead of `onClick`. Without this, clicking the bolt blurs the editor, which triggers a dock state transition from `DOCK_EDITOR` → `BASE`, which unmounts the toolbar before the `click` event fires — so `onAIPrompt` never gets called. Preventing the default on mousedown keeps the editor focused and the toolbar mounted.

---

## The inline dock prompt

Clicking any bolt sets `promptOpen = true` in App, which makes the Dock ignore its normal state machine and render the prompt row instead:

```
[✓]  [────────── text input (flex:1) ──────────]  [✕]
```

The tick is on the left — spatially identical to the bolt that opened it, so the two-click gesture (open, confirm) lands in the same place. Enter confirms; Escape cancels. The input autofocuses.

The Dock stores the typed text in local state (`localPromptText`), which is reset when `promptOpen` becomes false. No text state leaks between invocations.

**For DOCK_PROMPT specifically:** `handleOpenAIPrompt` saves a reference to `activeEditor` into `savedEditorRef` before `setPromptOpen(true)` is called. By the time the component re-renders and the prompt input steals focus, `activeEditor` would have cleared (the editor blurred). The saved ref is used on confirm to insert the embedded card, and on dismiss to refocus the editor so the dock returns to `DOCK_EDITOR`/`TAB_EDITOR` state.

---

## What gets sent to the AI

Every request sends the same context regardless of entry point:

**Context cards** (`assembleContext(entries)`) — every card in the current tab that is not hidden, as `{ id, title, body }` in position order. Hidden cards (eye-off toggle) are excluded; folded cards are included (folding is a display affordance, not a context exclusion).

**Effective prompt** — resolved by `runAI`:
- Non-empty user text → used as-is
- Empty text, `TAB_NEW_CARD` → default new-card-for-tab prompt
- Empty text, `DOCK_NEW_CARD` → default reference card prompt
- Empty text, `DOCK_PROMPT` with embed callback → default embed prompt
- Empty text, `DOCK_PROMPT` without callback → no-op, returns `false`

**Entry point** — sent as `entryPoint` in the request body so the edge function can select the right system message.

---

## The response format

The model is instructed to respond with this exact structure and nothing else:

```
<card>
<type>text</type>
<title>Card title here (max 80 characters)</title>
<body>
Body content as plain text.
</body>
</card>
```

**Why tags, not JSON:** Small models reliably produce XML-like tag output. JSON caused the model to enter "tool call mode" and return `content: null`.

**Why structured at all:** The previous format (title on first line, body below) was parsed inline in the streaming loop with special-case newline logic. It couldn't distinguish fields from content, was fragile to model variation, and would require prompt changes to add new fields. The tag format keeps parsing in a dedicated pure function (`parseCardStream`), is streamable (body content is emitted before `</body>` arrives), and is extensible: adding a new field like `<operation>` or `<targetCardId>` only requires a parser change, not a prompt format change.

**`type` is always `text` for now** but is present in the format because future card types (file attachments, portals, stacks) will need different handling. The type field makes that a parsing branch rather than a format redesign.

---

## Parsing the stream

`parseCardStream(accumulated)` is a pure function that takes the full accumulated text received so far and returns `{ type, title, body, done }`. It is called repeatedly on the growing string as SSE deltas arrive.

- **`type` and `title`** are `null` until their closing tags arrive. Once `</type>` or `</title>` is seen the value is extracted and stays fixed.
- **`body`** is `null` until `<body>` opens. Once it does, body content streams live — `body` is the text between `<body>` and wherever the stream currently is. Any trailing partial closing tag (e.g. `</bo` at a chunk boundary) is stripped by finding the last unmatched `<` in the string.
- **`done`** becomes `true` when `</body>` or `</card>` appears. The streaming loop breaks immediately when `done` is true, without waiting for the SSE `[DONE]` sentinel.

`parseCardStream` never mutates state; the streaming loop in `runDockPrompt` calls it each iteration and schedules a batched UI update via `requestAnimationFrame` when title or body is available. On loop exit, a final call to `parseCardStream` writes the definitive values. If the model ignores the format entirely, all fields remain `null` and the card gets `title: 'Response', body: ''`.

The raw SSE envelope is still handled by the existing `parseStreamChunk` (which extracts the delta string from an OpenRouter `data:` line). `parseCardStream` only sees the accumulated plain-text output, not the SSE framing.

---

## Embed vs. standalone creation

`runDockPrompt(promptText, onCardCreated, entryPoint)` handles both cases through one parameter:

**`onCardCreated` is null (tab mode)**
`addCard()` is called, which creates the card in the DB *and* adds a `tabCard` entry — the card appears in the tab immediately as an empty item, then fills in.

**`onCardCreated` is a function (embed mode)**
`createCard()` + `putCard()` + `setCardsById()` are called directly — the card is saved to the DB and is available in React state, but no `tabCard` entry is created so it does not appear in the tab list. `onCardCreated(card.id)` is then called, which (in App) runs:

```js
editor.chain().focus().insertContent({ type: 'embeddedCard', attrs: { cardId } }).run()
```

This inserts the embedded card node at the editor cursor position and refocuses the editor, so the dock returns to `DOCK_EDITOR` state. Streaming then fills in the card's title and body live — the embedded card renders those updates in place.

---

## System messages

Each entry point gets a distinct system message that frames what the model should create. All three share the same `FORMAT_RULE` suffix (the tag format instruction). Both `buildPrompt.js` (client, used in tests) and the edge function's `buildMessages` define the same `SYSTEM_MESSAGES` map — if the wording changes, update both.

**TAB_NEW_CARD** — "study the context cards to understand what this tab is about, then create content that fits and extends it — something genuinely useful given what's already there"

**DOCK_NEW_CARD** — "a compact reference card to keep pinned at the bottom of their screen while they work… a focused, reusable reference — something worth keeping at hand. Keep it concise"

**DOCK_PROMPT** — "the user is editing a card and wants to embed a new card inline within it… a self-contained embedded reference — something that enriches the surrounding card when read in context"

Unknown entry points fall back to `TAB_NEW_CARD`.

---

## Edge function

`supabase/functions/dock-prompt/index.ts` receives `{ prompt, contextCards, entryPoint }`, builds the messages array via its local `buildMessages` (mirroring `buildPrompt.js`), and streams the OpenRouter response back as SSE.

Model: `meta-llama/llama-3.3-70b-instruct`. The only place model selection lives is `MODEL_CONFIG.model` in the edge function. `entryPoint` defaults to `'TAB_NEW_CARD'` if omitted (backwards compatible with any client that doesn't send it).

```bash
supabase secrets set OPENROUTER_API_KEY=<your-key>
supabase functions deploy dock-prompt
```

---

## File map

```
src/
  ai/
    assembleContext.js            Pure: tab entries → visible contextCards [{id,title,body}]
    assembleContext.test.js       [TEST]
    buildPrompt.js                Pure: entryPoint → SYSTEM_MESSAGES[entryPoint] + FORMAT_RULE + context block
    buildPrompt.test.js           [TEST]
    parseCardStream.js            Pure: accumulated SSE text → {type, title, body, done} (incremental)
    parseCardStream.test.js       [TEST]
    streamParser.js               Pure: one SSE data: line → delta string | null
    streamParser.test.js          [TEST]
    parseDockPromptContent.js     Superseded (old first-line format). Not used in production.
    parseDockPromptContent.test.js
    AIPrompt.jsx / .css           Retired (floating panel approach). Not mounted anywhere.
    AIPrompt.test.jsx / .stories.jsx
  tab/
    Dock.jsx                      Inline prompt mode render branch; TickIcon; bolt positioning;
                                  onMouseDown fix for formatting toolbar bolt
    Dock.css                      .dock__lightning-btn (amber), .dock--ai-prompt, .dock__ai-input
    Tab.jsx                       Tab bolt, left of AddCardButton
    Tab.css                       .tab__ai-btn (amber, solid border)
    useTabs.js                    runDockPrompt (streaming + embed/tab paths), runAI (prompt resolution)
    useTabs.test.js               [TEST]
  App.jsx                         handleOpenAIPrompt / handlePromptSubmit / handlePromptDismiss;
                                  promptOpen + aiEntryPoint state; savedEditorRef
supabase/
  functions/
    dock-prompt/
      index.ts                    Deno edge function: entryPoint → system message, OpenRouter SSE
```

---

## Tests

| File | Covers |
|---|---|
| `assembleContext.test.js` | Empty input; id/title/body mapping; hidden cards excluded; folded included; position order; all-hidden → [] |
| `buildPrompt.test.js` | Two-element array; system contains `<card>` tags; user contains prompt; card content; no-cards placeholder; untitled → "Card N"; multi-card dividers; per-entry-point system text; unknown falls back |
| `parseCardStream.test.js` | Complete response; all-null before tags; partial type/title; empty title → Response; body null before `<body>`; streaming body; partial closing tag stripped; lone `<` stripped; done on `</body>` and `</card>`; whitespace trimming; multi-line body; body null (not `''`) on just-opened `<body>` |
| `streamParser.test.js` | Delta extraction; null for `[DONE]`; null for non-data lines; null for parse errors |
| `useTabs.test.js (runDockPrompt)` | Card created then filled via parseCardStream; two-chunk streaming; graceful fallback when no format tags; fetch body contents; error handling; hidden-card exclusion; embed mode (onCardCreated called, card not in tab entries) |
| `useTabs.test.js (runAI)` | Default prompts per entry point; DOCK_PROMPT text passthrough; DOCK_PROMPT empty no-op; DOCK_PROMPT + onCardCreated default prompt; callback passed to runDockPrompt; entryPoint in fetch body; success/error returns |

---

## Not built yet

- `CARD_EDIT` — rewrite the body of the card currently being edited (diff path)
- `SELECTION_BATCH` — use selected cards as primary context
- Dock card context — pinned dock cards not included in `contextCards`
- Error display in inline mode — `aiError` is set but not surfaced in the dock prompt UI
- Abort mid-stream
- Approve/deny before a card is committed
- Streaming progress indicator
- Model picker or per-user model preference
- Context scoping beyond the hidden toggle
