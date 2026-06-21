import { describe, expect, it } from 'vitest'
import { createIndexEntry } from './createIndexEntry'
import { computeContentHash } from '../sync/cardSyncLogic'
import { getBrainFeedItems, getOrphanCards, getStaleEntries } from './brainFeedLogic'

function makeLibraryCard(id, title, body = '') {
  return {
    id,
    type: 'text',
    title,
    body,
    config: null,
    location: 'library',
    folderId: null,
    createdAt: 1,
    updatedAt: 1,
  }
}

describe('getStaleEntries', () => {
  it('returns empty array for empty inputs', () => {
    expect(getStaleEntries({}, [])).toEqual([])
  })

  it('flags library cards whose content hash differs from the index entry', () => {
    const card = makeLibraryCard('c1', 'Stale note', 'original body')
    const entry = createIndexEntry({
      cardId: 'c1',
      title: 'Stale note',
      contentHash: 'wrong-hash',
    })
    expect(getStaleEntries({ c1: card }, [entry])).toEqual([
      { cardId: 'c1', title: 'Stale note', reason: 'stale' },
    ])
  })

  it('does not flag in-sync library cards', () => {
    const card = makeLibraryCard('c1', 'Fresh note', 'body text')
    const entry = createIndexEntry({
      cardId: 'c1',
      title: 'Fresh note',
      contentHash: computeContentHash(card),
    })
    expect(getStaleEntries({ c1: card }, [entry])).toEqual([])
  })

  it('excludes non-library cards', () => {
    const card = { ...makeLibraryCard('c1', 'Shelf note'), location: 'shelf' }
    const entry = createIndexEntry({ cardId: 'c1', contentHash: 'wrong-hash' })
    expect(getStaleEntries({ c1: card }, [entry])).toEqual([])
  })
})

describe('getOrphanCards', () => {
  it('returns empty array for empty inputs', () => {
    expect(getOrphanCards({}, [])).toEqual([])
  })

  it('flags library cards with no links in or out', () => {
    const card = makeLibraryCard('c1', 'Lonely note')
    expect(getOrphanCards({ c1: card }, [])).toEqual([
      { cardId: 'c1', title: 'Lonely note', reason: 'orphan' },
    ])
  })

  it('does not flag library cards linked as source or target', () => {
    const card = makeLibraryCard('c1', 'Connected note')
    const asSource = [{ sourceCardId: 'c1', targetCardId: 'c2', linkType: 'embed', createdAt: 1 }]
    const asTarget = [{ sourceCardId: 'c2', targetCardId: 'c1', linkType: 'embed', createdAt: 1 }]
    expect(getOrphanCards({ c1: card }, asSource)).toEqual([])
    expect(getOrphanCards({ c1: card }, asTarget)).toEqual([])
  })

  it('excludes non-library cards', () => {
    const card = { ...makeLibraryCard('c1', 'Tab note'), location: 'none' }
    expect(getOrphanCards({ c1: card }, [])).toEqual([])
  })
})

describe('getBrainFeedItems', () => {
  it('returns empty array for empty inputs', () => {
    expect(getBrainFeedItems({}, [], [])).toEqual([])
  })

  it('merges stale and orphan items sorted by title', () => {
    const staleCard = makeLibraryCard('c1', 'Beta note', 'changed')
    const orphanCard = makeLibraryCard('c2', 'Alpha note')
    const entry = createIndexEntry({ cardId: 'c1', contentHash: 'wrong-hash' })

    expect(getBrainFeedItems({ c1: staleCard, c2: orphanCard }, [entry], [])).toEqual([
      { cardId: 'c2', title: 'Alpha note', reason: 'orphan' },
      { cardId: 'c1', title: 'Beta note', reason: 'stale' },
    ])
  })

  it('dedupes by cardId preferring stale over orphan', () => {
    const card = makeLibraryCard('c1', 'Both flags', 'changed')
    const entry = createIndexEntry({ cardId: 'c1', contentHash: 'wrong-hash' })

    expect(getBrainFeedItems({ c1: card }, [entry], [])).toEqual([
      { cardId: 'c1', title: 'Both flags', reason: 'stale' },
    ])
  })
})
