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

export const NoControls = {
  args: {
    title: 'No controls',
    body: 'Used without fold/hide callbacks.',
    onToggleFold: undefined,
    onToggleHide: undefined,
  },
}
