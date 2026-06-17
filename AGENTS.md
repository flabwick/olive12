# AGENTS.md

Convention layer for this project. Read this before starting a new slice. Update it if a practice changes — it's reference material to paste back into future prompts, not a one-time explanation.

---

## The core idea

Build the smallest true subset of each piece, prove it works in isolation, then extend only when a later piece actually needs more. Never build the "eventual" version of something speculatively — the full design doc describes where the system ends up, not where any individual slice starts.

A **subset** is something you extend later without rewriting. A **simplified version** is something you throw away later. Always aim for the former.

Test: can the next version be "this, plus more fields/behavior" without undoing what's there now? If not, it was built at the wrong scope.

A second test, same spirit: if this slice has no test proving it works, you don't actually know which kind you built. Untested code's scope is a guess, not a fact.

---

## Order of operations, every slice

Each layer is fully working, **tested**, and committed before the next starts. Don't let "while I'm in here" pull two layers into one sitting.

1. **Data shape** — write down the shape as a plain object/type, no code behavior yet.
2. **Pure logic** — plain functions, no React, no storage, no side effects.
   - Write the Vitest unit tests alongside (or just before) the function. Run `npm run test` before moving on.
3. **Storage/data access** — plain functions wrapping persistence (Dexie, Supabase). Still no React.
   - Test against the real adapter (or its local emulator/test DB) — not just a mock — at least once per slice, so the contract is actually proven. Mock it only in tests that aren't about persistence itself.
   - Run `npm run test` before moving on.
4. **Hook** — wraps storage functions for React, owns the React state.
   - Test the hook's state transitions (loading → success/error, optimistic update → confirmed/rolled-back) with Vitest + React Testing Library. Don't skip this layer because "it's just plumbing" — plumbing is exactly where state bugs hide.
5. **Dumb UI** — presentational component, props in, render out, no logic.
   - Every dumb component gets a Storybook story in the same commit. No exceptions, no "I'll add the story later."
   - Run Storybook and **look at the story** (or run it through the Storybook test runner / `npm run test-storybook` if configured) before calling the layer done. A story that exists but was never actually rendered and checked doesn't count as verification.

If a slice involves a flow a real user would carry out across multiple layers (e.g. "add item → see it in list → mark complete"), add **one** Playwright end-to-end test for that flow once the layers above it are individually proven. Don't write the E2E test as a substitute for the unit/component tests below it — it's a capstone, not a replacement.

---

## Testing is not a separate phase

Testing isn't something that happens "after the feature is built" — it's part of what makes each layer countable as done. A layer without its corresponding test is not finished; it's a draft.

**Per layer, per slice:**

| Layer | Test type | Tool | Gate |
|---|---|---|---|
| Pure logic | Unit test | Vitest | `npm run test` passes |
| Storage/data access | Integration test (real adapter where feasible) | Vitest | `npm run test` passes |
| Hook | State-transition test | Vitest + React Testing Library | `npm run test` passes |
| Dumb UI | Story + visual check | Storybook (+ `test-storybook` if configured) | Story renders correctly, all states represented |
| Cross-layer user flow (only when a slice produces one) | E2E | Playwright | Flow completes against the real app |

**Before any commit:**
- `npm run test` is green. Not "mostly green," not "those two failures are unrelated" — green.
- Every new/changed dumb component has a story, and that story has actually been run/viewed, not just written.
- If the slice touched a user-facing flow, the relevant Playwright spec (new or existing) passes.

**Before any slice is considered done**, not just before commit — these are the same checklist, but "done" means you ran it, not that you intend to.

If a test is inconvenient to write, that's usually a signal the function/component is doing too much or reaching outside its layer (e.g. pure logic secretly calling storage) — fix the seam, don't skip the test.

Writing a test that asserts almost nothing ("renders without crashing") to satisfy the letter of this rule defeats its purpose. The test should fail if the logic is wrong. If it can't fail in any realistic scenario, write a better one.

---

## File discipline

- One file, one responsibility. If a file is doing two things, split it — don't wait until it's unmanageable.
- New functionality gets new files by default. Adding to an existing file is the exception, not the convenience option.
- Every feature follows the same four/five-piece pattern: pure function + test, storage function + test, hook + test, dumb component + story (per the card primitive doc as the template).
- Test files live next to what they test (`thing.ts` + `thing.test.ts`, `Card.tsx` + `Card.stories.tsx`), not in a parallel mirrored tree, unless the project's existing convention already says otherwise.
- Before writing code for anything non-trivial, get a one-line file plan first: which files get touched, one sentence each — and call out which test/story files are part of that same plan, since they're not optional extras. If the plan touches more files than the feature obviously requires, stop and ask why before any code is written.

---

## Slicing

- Build vertical slices (one full feature end to end) not horizontal layers (the whole backend, then the whole frontend).
- Order slices by dependency, not by importance: data model → data access → logic → UI, repeated per feature.
- Across the wider project, order features so collision risk is deferred — single-user/local features before multi-tab sync, sync before sharing, sharing before automation/billing.
- A slice isn't finished when the code runs once in dev. It's finished when its tests exist, pass, and are part of what gets committed.

---

## What to explicitly not build yet

Every feature doc ends with a "not built yet" list. This isn't a TODO — it's a guardrail. Anything in that list is something we are actively choosing not to build, because nothing real has yet demanded it. Pre-building it "because the design doc mentions it" is the failure mode this whole approach exists to avoid.

This applies to tests too: don't write tests for behavior that doesn't exist yet "to be thorough" or scaffold test suites for future layers. Test what's built, not what's planned.

---

## Session hygiene

- One slice per session/conversation where reasonable. Long, sprawling sessions degrade decision quality — context gets blurry, conventions drift.
- Commit after every working **and tested** slice. Git is the undo button, not "ask the AI to fix it again." A commit where `npm run test` hasn't been run is not a checkpoint you can trust.
- Read every diff before accepting it. Check for: new files where expected (including test/story files), no unrelated files touched, no new pattern invented where an existing one already covers the case, no test deleted or weakened just to make a run go green.
- Refactor passes scheduled periodically, not just when something breaks — check for duplicated logic, inconsistent patterns, and stale or skipped tests across slices.

---

## Documentation

Each primitive/feature gets a brief doc: what exists, files and their responsibilities (including test/story files), rules for extending, what's explicitly not built yet, and what test coverage exists for it. Keep them short — reference material to paste back into future prompts, not explanations for humans to read once.
