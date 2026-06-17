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
