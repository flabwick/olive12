import { CardBack } from './CardBack'

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
  },
}
