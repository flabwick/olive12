import { Card } from './Card'

export default {
  title: 'Card/Card',
  component: Card,
  args: {
    title: 'Meeting notes',
    body: 'Discuss roadmap and next steps.',
    foldState: false,
    hiddenState: false,
    onToggleFold: () => {},
    onToggleHide: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
    onUpdate: () => {},
  },
}

export const Default = {}

export const Empty = {
  args: {
    title: '',
    body: '',
  },
}

export const MultilineBody = {
  args: {
    title: 'Shopping list',
    body: 'Milk\nEggs\nBread',
  },
}

export const Folded = {
  args: {
    title: 'Collapsed card',
    body: 'This body is not visible.',
    foldState: true,
  },
}

export const Hidden = {
  args: {
    title: 'Dimmed card',
    body: 'This card is visually dimmed.',
    hiddenState: true,
  },
}

export const FirstCard = {
  args: {
    title: 'First card',
    body: 'No up arrow.',
    onMoveUp: undefined,
  },
}

export const LastCard = {
  args: {
    title: 'Last card',
    body: 'No down arrow.',
    onMoveDown: undefined,
  },
}

export const NoControls = {
  args: {
    title: 'No controls',
    body: 'Used without callbacks.',
    onToggleFold: undefined,
    onToggleHide: undefined,
    onMoveUp: undefined,
    onMoveDown: undefined,
    onUpdate: undefined,
  },
}

export const FlippableCard = {
  args: {
    title: 'What is the capital of France?',
    body: 'A geography question.',
    back: 'Paris',
    flipped: false,
    onFlip: () => console.log('flip'),
  },
}

export const FlippedCard = {
  args: {
    title: 'What is the capital of France?',
    body: 'A geography question.',
    back: 'Paris',
    flipped: true,
    onFlip: () => console.log('flip back'),
  },
}

export const NoBackCard = {
  args: {
    title: 'Regular card',
    body: 'This card has no back face — flip button is absent.',
    back: '',
    onFlip: () => console.log('flip'),
  },
}

export const Selected = {
  args: {
    title: 'Selected card',
    body: 'This card is selected.',
    selected: true,
    onToggleSelect: () => {},
  },
}

export const Selectable = {
  args: {
    title: 'Selectable card',
    body: 'Click the checkbox to select.',
    selected: false,
    onToggleSelect: () => {},
  },
}
