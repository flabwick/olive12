import { Card } from './Card'

export default {
  title: 'Card/Card',
  component: Card,
  args: {
    title: 'Meeting notes',
    body: 'Discuss roadmap and next steps.',
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
