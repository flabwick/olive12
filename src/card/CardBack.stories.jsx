import { CardBack } from './CardBack'

const indexEntry = {
  cardId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  title: 'React Hooks Overview',
  tags: ['react', 'hooks', 'frontend'],
  summary: 'A guide to using useState, useEffect, and custom hooks in React.',
  links: ['card-abc', 'card-def'],
  contentHash: 'abc123',
  updatedAt: new Date('2026-06-20T14:30:00').getTime(),
}

export default {
  title: 'Card/CardBack',
  component: CardBack,
  parameters: { layout: 'padded' },
  args: {
    cardId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date('2026-01-15T09:00:00').getTime(),
    updatedAt: new Date('2026-06-20T14:30:00').getTime(),
    onFlip: () => console.log('flip to front'),
    onBackChange: (v) => console.log('change:', v),
    back: '',
    editing: false,
  },
}

export const WithContent = {
  args: {
    back: 'The capital of France is Paris.',
    editing: false,
  },
}

export const Editing = {
  args: {
    back: 'Draft answer text.',
    editing: true,
  },
}

export const EmptyBack = {
  args: {
    back: '',
    editing: false,
    location: 'none',
  },
}

export const WithIndexEntry = {
  args: {
    back: 'Some notes on the front side.',
    location: 'library',
    indexEntry,
    indexDebugOpen: false,
  },
}

export const WithLinksOnly = {
  args: {
    back: '',
    location: 'library',
    indexEntry: null,
    indexDebugOpen: false,
  },
}

export const LibraryCard = {
  args: {
    back: 'A few personal notes.',
    location: 'library',
    indexEntry,
    indexDebugOpen: false,
  },
}
