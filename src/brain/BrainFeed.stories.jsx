import { BrainFeed } from './BrainFeed'

const items = [
  { cardId: 'c1', title: 'Project overview', reason: 'stale' },
  { cardId: 'c2', title: 'Meeting notes Jan 5', reason: 'orphan' },
]

export default {
  title: 'Brain/BrainFeed',
  component: BrainFeed,
  args: {
    onAccept: () => {},
    onDismiss: () => {},
  },
}

export const WithItems = {
  args: { items },
}

export const Empty = {
  args: { items: [] },
}
