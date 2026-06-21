import { BrainFeedItem } from './BrainFeedItem'

export default {
  title: 'Brain/BrainFeedItem',
  component: BrainFeedItem,
  args: {
    cardId: 'c1',
    title: 'Meeting notes from Monday',
    onReindex: () => {},
  },
}

export const Stale = {
  args: { reason: 'stale' },
}

export const Orphan = {
  args: { reason: 'orphan' },
}

export const NoAction = {
  args: { onReindex: undefined },
}
