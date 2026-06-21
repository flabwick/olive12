import { BrainFeedList } from './BrainFeedList'

const items = [
  { cardId: 'c1', title: 'Stale meeting notes', reason: 'stale' },
  { cardId: 'c2', title: 'Unlinked research doc', reason: 'orphan' },
  { cardId: 'c3', title: 'Outdated project brief', reason: 'stale' },
]

export default {
  title: 'Brain/BrainFeedList',
  component: BrainFeedList,
  args: {
    items,
    onReindex: () => {},
  },
}

export const WithItems = {}

export const Empty = {
  args: { items: [] },
}

export const SingleStale = {
  args: {
    items: [{ cardId: 'c1', title: 'Stale meeting notes', reason: 'stale' }],
  },
}

export const SingleOrphan = {
  args: {
    items: [{ cardId: 'c2', title: 'Unlinked research doc', reason: 'orphan' }],
  },
}
