/**
 * Development seed data. Exposed as window.__seedDevData() in dev mode.
 * Run once from the browser console to populate the database with test fixtures.
 * Running again will overwrite existing records with the same IDs.
 */

import { db } from '../db/vaultDb'

const now = Date.now()
const ago = (ms) => now - ms
const min = 60_000
const hr = 60 * min
const day = 24 * hr

// ─── IDs ──────────────────────────────────────────────────────────────────────

// Folders
const F_PROJECTS = 'seed-folder-projects'
const F_ALPHA    = 'seed-folder-alpha'
const F_READING  = 'seed-folder-reading'

// Tabs
const T_DAILY    = 'seed-tab-daily'
const T_RESEARCH = 'seed-tab-research'
const T_STACK    = 'seed-tab-stacks'
const T_SHELF    = 'seed-tab-shelf'        // saved to shelf, open
const T_LIB      = 'seed-tab-library'      // saved to library, open
const T_CLOSED   = 'seed-tab-closed'       // saved to shelf, closed

// Cards — text
const C_MEETING     = 'seed-card-meeting'
const C_TODO        = 'seed-card-todo'
const C_RANDOM      = 'seed-card-random'
const C_IDEA        = 'seed-card-idea'
const C_QUANTUM     = 'seed-card-quantum'
const C_LINKS       = 'seed-card-links'
const C_BOOKMARK    = 'seed-card-bookmark'
const C_SHELF1      = 'seed-card-shelf1'
const C_SHELF2      = 'seed-card-shelf2'
const C_LIB1        = 'seed-card-lib1'
const C_LIB2        = 'seed-card-lib2'
const C_LIB3        = 'seed-card-lib3'
const C_FOLDED      = 'seed-card-folded'
const C_HIDDEN      = 'seed-card-hidden'
const C_FLIPPED     = 'seed-card-flipped'

// Cards — file
const C_FILE_PDF    = 'seed-card-file-pdf'
const C_FILE_IMG    = 'seed-card-file-img'
const C_FILE_CSV    = 'seed-card-file-csv'

// Cards — stack
const C_STACK_A     = 'seed-stack-a'
const C_STACK_B     = 'seed-stack-b'

// Cards — portal
const C_PORTAL      = 'seed-card-portal'

// ─── Folders ──────────────────────────────────────────────────────────────────

const folders = [
  { id: F_PROJECTS, name: 'Projects',       parentId: null, createdAt: ago(30*day), updatedAt: ago(30*day) },
  { id: F_ALPHA,    name: 'Alpha',           parentId: F_PROJECTS, createdAt: ago(20*day), updatedAt: ago(20*day) },
  { id: F_READING,  name: 'Reading',         parentId: null, createdAt: ago(10*day), updatedAt: ago(10*day) },
]

// ─── Cards ────────────────────────────────────────────────────────────────────

const cards = [
  // ── tab: Daily Notes ──
  {
    id: C_MEETING, type: 'text',
    title: 'Weekly Sync',
    body: '## Agenda\n\n- Sprint review\n- Blockers\n- Next sprint planning\n\n## Notes\n\nTeam agreed to push the auth refactor to next week. Design review scheduled for Thursday.',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(2*hr), updatedAt: ago(45*min),
  },
  {
    id: C_TODO, type: 'text',
    title: 'Todo',
    body: '- [ ] Review PR #142\n- [ ] Update docs for new upload flow\n- [x] Fix portal selection bug\n- [ ] Write release notes',
    back: 'Remember: checklist items use GitHub flavoured markdown',
    location: 'none', folderId: null, config: null,
    createdAt: ago(1*day), updatedAt: ago(30*min),
  },
  {
    id: C_RANDOM, type: 'text',
    title: 'Random thought',
    body: 'What if the tab bar showed the card count as a small badge? Would make it easier to know which tabs have stuff in them at a glance.',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(3*hr), updatedAt: ago(3*hr),
  },
  {
    id: C_FOLDED, type: 'text',
    title: 'Folded card (test)',
    body: 'This card starts folded. The body should be hidden until unfolded.',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(4*hr), updatedAt: ago(4*hr),
  },
  {
    id: C_HIDDEN, type: 'text',
    title: 'Hidden card (test)',
    body: 'This card starts hidden — it should be collapsed to just a sliver.',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(5*hr), updatedAt: ago(5*hr),
  },
  {
    id: C_FLIPPED, type: 'text',
    title: 'Flipped card',
    body: 'Front side — this card will start flipped to show the back.',
    back: 'Back side: This is the reverse of the card. Useful for flashcard-style notes.',
    location: 'none', folderId: null, config: null,
    createdAt: ago(6*hr), updatedAt: ago(6*hr),
  },

  // ── tab: Research ──
  {
    id: C_IDEA, type: 'text',
    title: 'Diffusion models — intuition',
    body: '## Core idea\n\nDiffusion models learn to *reverse* a noise process. Training: gradually add Gaussian noise to data until it looks random. Then train a neural net to predict and remove the noise step by step.\n\n## Why it works\n\nThe denoising objective is surprisingly expressive — the model effectively learns the score function of the data distribution.',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(2*day), updatedAt: ago(1*day),
  },
  {
    id: C_QUANTUM, type: 'text',
    title: 'Quantum entanglement notes',
    body: 'Entangled particles share a quantum state — measuring one instantly affects the other regardless of distance. This does NOT allow FTL communication because the measurement outcomes are random; you can only see the correlation after comparing results via a classical channel.',
    back: 'Bell inequality: if violated, no local hidden variable explanation is possible.',
    location: 'none', folderId: null, config: null,
    createdAt: ago(3*day), updatedAt: ago(3*day),
  },
  {
    id: C_LINKS, type: 'text',
    title: 'Useful papers',
    body: '- "Attention Is All You Need" — Vaswani et al. (2017)\n- "Denoising Diffusion Probabilistic Models" — Ho et al. (2020)\n- "Language Models are Few-Shot Learners" — Brown et al. (2020)',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(5*day), updatedAt: ago(5*day),
  },
  {
    id: C_BOOKMARK, type: 'text',
    title: 'Bookmark dump',
    body: '- arxiv.org/abs/2303.08774\n- distill.pub\n- lilianweng.github.io\n- ml-systems.io',
    back: '',
    location: 'none', folderId: null, config: null,
    createdAt: ago(6*day), updatedAt: ago(6*day),
  },

  // ── file cards ──
  {
    id: C_FILE_PDF, type: 'file',
    title: 'spec-v2.pdf',
    fileName: 'spec-v2.pdf', fileType: 'application/pdf', fileSize: 1_240_000,
    body: '', back: '', config: null,
    location: 'none', folderId: null,
    createdAt: ago(1*day), updatedAt: ago(1*day),
  },
  {
    id: C_FILE_IMG, type: 'file',
    title: 'wireframe-home.png',
    fileName: 'wireframe-home.png', fileType: 'image/png', fileSize: 320_000,
    body: '', back: '', config: null,
    location: 'none', folderId: null,
    createdAt: ago(2*day), updatedAt: ago(2*day),
  },
  {
    id: C_FILE_CSV, type: 'file',
    title: 'user-survey.csv',
    fileName: 'user-survey.csv', fileType: 'text/csv', fileSize: 88_500,
    body: '', back: '', config: null,
    location: 'none', folderId: null,
    createdAt: ago(3*day), updatedAt: ago(3*day),
  },

  // ── stacks ──
  {
    id: C_STACK_A, type: 'stack',
    title: 'Research cluster',
    body: '', back: 'Stack of research notes.',
    config: { memberIds: [C_IDEA, C_QUANTUM, C_LINKS], topCardId: C_IDEA },
    location: 'none', folderId: null,
    createdAt: ago(1*day), updatedAt: ago(1*hr),
  },
  {
    id: C_STACK_B, type: 'stack',
    title: 'Files',
    body: '', back: '',
    config: { memberIds: [C_FILE_PDF, C_FILE_IMG, C_FILE_CSV], topCardId: C_FILE_PDF },
    location: 'none', folderId: null,
    createdAt: ago(2*day), updatedAt: ago(2*day),
  },

  // ── portal ──
  {
    id: C_PORTAL, type: 'portal',
    title: '', body: '', back: '', config: { target_card_id: C_SHELF1 },
    location: 'none', folderId: null,
    createdAt: ago(30*min), updatedAt: ago(30*min),
  },

  // ── shelf cards ──
  {
    id: C_SHELF1, type: 'text',
    title: 'Shelf note A',
    body: 'This card lives on the shelf. It can be portalled into any tab.',
    back: '',
    location: 'shelf', folderId: null, config: null,
    createdAt: ago(7*day), updatedAt: ago(7*day),
  },
  {
    id: C_SHELF2, type: 'text',
    title: 'Shelf note B',
    body: 'Another shelf card. These appear in the Shelf section of the vault.',
    back: 'Back of shelf note B',
    location: 'shelf', folderId: null, config: null,
    createdAt: ago(8*day), updatedAt: ago(8*day),
  },

  // ── library cards ──
  {
    id: C_LIB1, type: 'text',
    title: 'Architecture decisions',
    body: '## 2026-06 Decisions\n\n- Dexie for local storage (fast, IndexedDB wrapper)\n- Supabase for sync (Postgres + realtime)\n- Tiptap for rich text (ProseMirror base)\n- Vitest + RTL for unit tests\n- Playwright for E2E',
    back: '',
    location: 'library', folderId: F_ALPHA, config: null,
    createdAt: ago(30*day), updatedAt: ago(14*day),
  },
  {
    id: C_LIB2, type: 'text',
    title: 'User research summary',
    body: '## Key findings\n\n1. Users want to save tabs, not just cards\n2. The dock needs an upload button\n3. Reordering within stacks is a frequent request\n4. "Close tab" and "save tab" feel like different things to users',
    back: '',
    location: 'library', folderId: F_PROJECTS, config: null,
    createdAt: ago(14*day), updatedAt: ago(7*day),
  },
  {
    id: C_LIB3, type: 'text',
    title: 'Reading list',
    body: '- A Pattern Language — Christopher Alexander\n- The Design of Everyday Things — Don Norman\n- Working in Public — Nadia Eghbal\n- Four Thousand Weeks — Oliver Burkeman',
    back: '',
    location: 'library', folderId: F_READING, config: null,
    createdAt: ago(20*day), updatedAt: ago(20*day),
  },
]

// ─── Tabs ─────────────────────────────────────────────────────────────────────

const tabs = [
  {
    id: T_DAILY, name: 'Daily Notes', kind: 'blank', order: 0,
    savedLocation: 'none', savedFolderId: null, isOpen: true,
    createdAt: ago(10*day), updatedAt: ago(30*min),
  },
  {
    id: T_RESEARCH, name: 'Research', kind: 'blank', order: 1,
    savedLocation: 'none', savedFolderId: null, isOpen: true,
    createdAt: ago(5*day), updatedAt: ago(1*day),
  },
  {
    id: T_STACK, name: 'Stack testing', kind: 'blank', order: 2,
    savedLocation: 'none', savedFolderId: null, isOpen: true,
    createdAt: ago(2*day), updatedAt: ago(2*hr),
  },
  {
    id: T_SHELF, name: 'Saved to Shelf', kind: 'blank', order: 3,
    savedLocation: 'shelf', savedFolderId: null, isOpen: true,
    createdAt: ago(15*day), updatedAt: ago(3*day),
  },
  {
    id: T_LIB, name: 'In Library', kind: 'blank', order: 4,
    savedLocation: 'library', savedFolderId: F_PROJECTS, isOpen: true,
    createdAt: ago(20*day), updatedAt: ago(5*day),
  },
  {
    id: T_CLOSED, name: 'Closed saved tab', kind: 'blank', order: 5,
    savedLocation: 'shelf', savedFolderId: null, isOpen: false,
    createdAt: ago(25*day), updatedAt: ago(10*day),
  },
]

// ─── Tab cards ────────────────────────────────────────────────────────────────

const tabCards = [
  // Daily Notes
  { tabId: T_DAILY, cardId: C_MEETING,  position: 0, foldState: false, hiddenState: false },
  { tabId: T_DAILY, cardId: C_TODO,     position: 1, foldState: false, hiddenState: false },
  { tabId: T_DAILY, cardId: C_RANDOM,   position: 2, foldState: false, hiddenState: false },
  { tabId: T_DAILY, cardId: C_FOLDED,   position: 3, foldState: true,  hiddenState: false },
  { tabId: T_DAILY, cardId: C_HIDDEN,   position: 4, foldState: false, hiddenState: true  },
  { tabId: T_DAILY, cardId: C_PORTAL,   position: 5, foldState: false, hiddenState: false },

  // Research
  { tabId: T_RESEARCH, cardId: C_STACK_A,  position: 0, foldState: false, hiddenState: false },
  { tabId: T_RESEARCH, cardId: C_BOOKMARK, position: 1, foldState: false, hiddenState: false },

  // Stack testing
  { tabId: T_STACK, cardId: C_STACK_B,  position: 0, foldState: false, hiddenState: false },
  { tabId: T_STACK, cardId: C_FLIPPED,  position: 1, foldState: false, hiddenState: false },
  { tabId: T_STACK, cardId: C_SHELF1,   position: 2, foldState: false, hiddenState: false },

  // Saved to shelf tab
  { tabId: T_SHELF, cardId: C_MEETING,  position: 0, foldState: false, hiddenState: false },
  { tabId: T_SHELF, cardId: C_SHELF2,   position: 1, foldState: false, hiddenState: false },

  // Library tab
  { tabId: T_LIB, cardId: C_LIB1,      position: 0, foldState: false, hiddenState: false },
  { tabId: T_LIB, cardId: C_LIB2,      position: 1, foldState: false, hiddenState: false },

  // Closed tab (has cards but tab is closed — tests reopen)
  { tabId: T_CLOSED, cardId: C_RANDOM,  position: 0, foldState: false, hiddenState: false },
  { tabId: T_CLOSED, cardId: C_TODO,    position: 1, foldState: false, hiddenState: false },
]

// ─── Dock cards ───────────────────────────────────────────────────────────────

const dockCards = [
  { cardId: C_SHELF1,    order: 0 },
  { cardId: C_FILE_PDF,  order: 1 },
  { cardId: C_TODO,      order: 2 },
]

// ─── Write ────────────────────────────────────────────────────────────────────

export async function seedDevData() {
  await db.folders.bulkPut(folders)
  await db.cards.bulkPut(cards)
  await db.tabs.bulkPut(tabs)
  await db.tab_cards.bulkPut(tabCards)
  await db.dock_cards.bulkPut(dockCards)

  console.log(
    '[seed] Done.',
    `\n  ${folders.length} folders`,
    `\n  ${cards.length} cards (text, file, stack, portal)`,
    `\n  ${tabs.length} tabs (open, saved-shelf, saved-library, closed)`,
    `\n  ${tabCards.length} tab-card entries`,
    `\n  ${dockCards.length} dock cards`,
    '\n\nRefresh the page to see the seed data.',
  )
}

// Expose on window in dev mode so you can run window.__seedDevData() in the console
if (import.meta.env.DEV) {
  window.__seedDevData = seedDevData
}
