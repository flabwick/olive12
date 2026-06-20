# Vault System — Build Spec

> **Implementation status:** This document describes the target system. For what is actually built in the primary agent, see [README.md](../../README.md) and [docs/build/](../build/) — notably [cards.md](../build/cards.md) (flip/back), [brain.md](../build/brain.md) (wiki index, library-only), [debug.md](../build/debug.md), and [tabs.md](../build/tabs.md).

## Stack

- React + Vite + Tailwind. Capacitor (mobile). Tauri (desktop).
- Tiptap (rich text), dnd-kit (drag/drop), motion (flip animations).
- Supabase: Postgres, Auth (OAuth only), Storage, Edge Functions, Realtime (jobs table only).
- Dexie.js: local IndexedDB cache, instant-write source of truth for active session.
- No offline mode. No client-held provider API keys. No BYOK.

## Core Concepts

- **Vault**: the database. **Tabs**: ordered collections of cards, user-built or system-built (smart tabs). **Cards**: text, process, portal, transient, container. **Shelf**: chronological, unsorted save target. **Library**: organized, wiki-indexed save target. **Dock**: sticky footer, two modes — Prompt (LLM call over tab context, diff-based approve/deny per card) and Dock (holding area for cards/drafts between tabs). **Brain**: Library + Wiki index + Brain feed (maintenance queue).

## Schema

```
cards            id, type, subtype, title, body(jsonb), config(jsonb),
                 location(none|shelf|library), content_hash, user_id,
                 created_at, updated_at

links            id, source_card_id, target_card_id, link_type, created_at
                 -- derived table, never hand-edited (see Link Graph below)

tabs             id, name, kind(blank|smart), order, user_id, updated_at

tab_cards        tab_id, card_id, position, fold_state, hidden_state
                 -- fold/hide is per-tab, not per-card

index_entries    card_id, title, tags[], summary, links[], content_hash, updated_at

container_children  container_card_id, child_card_id, position
                     -- directly maintained via drag/drop, not derived

jobs             id, card_id, user_id, type, status, input_ref,
                 output_card_id, cost_estimate, cost_actual,
                 created_at, completed_at

credits_ledger   id, user_id, amount, type(debit|credit|hold|release),
                 reference, created_at
```

## Card Type Semantics

- `body`: optional prose/rich content (Tiptap JSON). Primary content for text cards. Optional annotation for other types.
- `config`: strict, subtype-keyed structured fields + execution state. Empty for text cards. Required for process/portal cards.
- `subtype`: plain column for filtering (e.g. `llm_prompt`, `web_search`, `ocr`, `compute_job`). Validate `config` shape per subtype at app layer (zod or equivalent), not in Postgres.
- Portal card `config`: `{ target_card_id }`.
- Container card: no body/config payload; children live in `container_children`.
- Process card `config`: `{ subtype, params, input_card_ids, job_id }`. Re-run creates a new `jobs` row; `config.job_id` points to latest. Does not overwrite history.

## Link Graph Maintenance

- `links` is derived, recomputed on every card save (debounced), in the same transaction as the card update: delete existing outgoing rows for that source, parse `body` (Tiptap embed/mention nodes) + `config` (portal target, process `input_card_ids`), insert resulting set.
- Never write to `links` directly from any other code path.
- Orphan detection = zero rows in or out, post-derivation.
- Dock context assembly: dedupe by card_id, cap recursion depth, to handle diamond-shaped and cyclic embed graphs.

## Wiki / Brain

- `index_entries` written only by Wiki LLM, only on: promotion to Library, or accept action in Brain feed. No other write path.
- Wiki LLM read scope on write: the one card body being indexed + bounded neighborhood of existing `index_entries` (N-hop in link graph or top-K by tag/embedding similarity). Never full library scan.
- Staleness = `cards.content_hash` ≠ `index_entries.content_hash`. Hash covers `body` (+ `config` where it materially changes card behavior).
- Brain feed flags: staleness, suspected contradictions, orphans. All require accept/dismiss/edit. No silent rewrite path outside promotion.
- Library/dock context search queries `index_entries` only, never card bodies.

## Sync Model

- Granularity: per card row. Dexie write is instant and authoritative for the active session; push to Supabase debounced (2–5s post-edit, or on blur/tab-switch).
- `tab_cards.position` syncs on its own, more eagerly than card content — decoupled from card `updated_at` to avoid false staleness signals.
- Conflict handling: last-write-wins by `updated_at`, with an optimistic-lock check before push — compare local cached `updated_at` to server's; if server is newer, prompt rather than overwrite silently. Required given portal cards make concurrent-tab collisions likely.
- No general realtime. One exception: Realtime subscription scoped to `jobs.status`, so card UI updates on job completion without manual refresh.
- Pull model otherwise: refresh-to-update.

## Execution Model (Process Cards)

- All execution server-side. No client-side provider calls, no client-held keys. Provider keys are Edge Function secrets only.
- Short/sync calls: Edge Function direct response, streamed (SSE) where possible — streaming avoids the 150s idle timeout since bytes are continuously sent.
- Long/async calls (OCR batches, agentic chains, anything exceeding the 400s background wall-clock limit, or routed to external compute): Edge Function enqueues a `jobs` row, returns immediately; separate worker (Fly.io/Railway-style long-running process, or managed inference/compute provider — Replicate/Modal/RunPod/fal.ai) executes, writes result + `output_card_id`, flips `jobs.status`.
- "Powerful compute instance" requests route through the same job queue, metered identically to LLM calls — proxy to managed providers, not self-hosted infrastructure.
- Web search and OCR follow the same job pattern as LLM calls; no special-cased client tier.

## Credits & Billing

- Single currency (`credits_ledger`) covers LLM calls, web search, OCR, compute instance time.
- Reserve-then-reconcile: estimate cost on enqueue → place `hold` → on completion, debit actual, release the difference.
- Container "run process recursively across N children": preflight cost estimate shown before execution; hold sized to estimate × N.
- Cost estimate surfaced in the process card UI before confirmation — same transparency principle as context-window visibility.

## File Handling

- Supabase Storage: one bucket, path `{user_id}/{card_id}/{filename}`. RLS keyed on first path segment matching `auth.uid()`.
- Upload flow: write Blob to Dexie immediately, render instantly; background-upload to Storage; on completion, write Storage path into card metadata.
- Cross-device: client-generated thumbnail synced inline with the card row for instant render; full file lazy-fetched on open.
- OCR source photos default to Shelf or ephemeral (not auto-promoted to Library); resulting text card holds a provenance link back to the source file.

## Risk Mitigations (carry into implementation)

- Portal concurrent-edit collision → optimistic-lock check at sync (above).
- Recursive/diamond embed blowup in dock context assembly → dedupe + depth cap (above).
- Unbounded context size with no user visibility → live token/size counter on tab.
- Process card re-run ambiguity → versioned `jobs` rows, never overwrite; downstream consumers of a stale output flagged via Brain feed.
- Wiki LLM prompt growth at scale → bounded read scope, never full-library read (above).


KEY THING: Invest in really quick loading states. It should all be buttery smooth as possible. Opening the app should have almost no loading state if possible.