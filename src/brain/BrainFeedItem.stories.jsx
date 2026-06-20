import { BrainFeedItem } from './BrainFeedItem'

export default {
  title: 'Brain/BrainFeedItem',
  component: BrainFeedItem,
  args: {
    cardId: 'card-1',
    title: 'Meeting notes from Monday standup',
    onAccept: () => {},
    onDismiss: () => {},
  },
}

export const Stale = {
  args: { reason: 'stale' },
}

export const Orphan = {
  args: { reason: 'orphan' },
}

export const NoTitle = {
  args: { reason: 'stale', title: '' },
}
