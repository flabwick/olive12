import { StackCard } from './StackCard'

const cardsById = {
  'card-a': { id: 'card-a', type: 'text', title: 'Meeting Notes', body: 'Key decisions from the team sync.' },
  'card-b': { id: 'card-b', type: 'text', title: 'Action Items', body: 'Follow up on deliverables.' },
  'card-c': { id: 'card-c', type: 'text', title: 'Resources', body: 'Links and references.' },
  'card-d': { id: 'card-d', type: 'text', title: 'Archive', body: '' },
  'card-file': { id: 'card-file', type: 'file', title: 'spec.pdf', fileName: 'spec.pdf', fileType: 'pdf', fileSize: 204800 },
  'nested-stack': {
    id: 'nested-stack',
    type: 'stack',
    title: 'Inner Stack',
    body: '',
    back: '',
    config: { memberIds: ['card-c', 'card-d'], topCardId: 'card-c' },
    location: 'none',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
}

const makeStack = (overrides = {}) => ({
  id: 'stack-1',
  type: 'stack',
  title: 'Q3 Planning',
  body: '',
  back: 'Stack back notes.',
  config: { memberIds: ['card-a', 'card-b', 'card-c'], topCardId: 'card-a' },
  location: 'none',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

export default {
  title: 'Stack/StackCard',
  component: StackCard,
  args: {
    cardsById,
    onToggleFold: () => {},
    onToggleHide: () => {},
    onClose: () => {},
    onFlip: () => {},
    onUpdate: () => {},
    onUpdateMember: () => {},
    onSaveToShelf: () => {},
    onSaveToShelfMember: () => {},
    flipCard: () => {},
    isFlipped: () => false,
    onCyclePrev: () => {},
    onCycleNext: () => {},
    onReorderMember: () => {},
  },
}

export const Default = {
  args: { stack: makeStack() },
}

export const SecondCardOnTop = {
  args: {
    stack: makeStack({ config: { memberIds: ['card-a', 'card-b', 'card-c'], topCardId: 'card-b' } }),
  },
}

export const Folded = {
  args: {
    stack: makeStack(),
    foldState: true,
  },
}

export const Hidden = {
  args: {
    stack: makeStack(),
    hiddenState: true,
  },
}

export const Flipped = {
  args: {
    stack: makeStack(),
    flipped: true,
  },
}

export const FourMembers = {
  args: {
    stack: makeStack({
      config: { memberIds: ['card-a', 'card-b', 'card-c', 'card-d'], topCardId: 'card-a' },
    }),
    cardsById: { ...cardsById },
  },
}

export const WithFileCard = {
  args: {
    stack: makeStack({
      config: { memberIds: ['card-a', 'card-file'], topCardId: 'card-a' },
    }),
  },
}

export const WithNestedStack = {
  args: {
    stack: makeStack({
      config: { memberIds: ['card-a', 'nested-stack'], topCardId: 'card-a' },
    }),
  },
}

export const EmptyStack = {
  args: {
    stack: makeStack({ config: { memberIds: [], topCardId: null } }),
  },
}

export const NoTitle = {
  args: {
    stack: makeStack({ title: '' }),
  },
}
