import { describe, expect, it } from 'vitest'
import { detectStaleEntries } from './brainFeedLogic'

const makeCard = (id, contentHash = 'hash-a') => ({ id, contentHash })
const makeEntry = (cardId, contentHash = 'hash-a') => ({ cardId, contentHash })
const makeLink = (sourceCardId, targetCardId) => ({ sourceCardId, targetCardId })

describe('detectStaleEntries', () => {
  it('returns empty array when both inputs are empty', () => {
    expect(detectStaleEntries([], [])).toEqual([])
  })

  it('returns empty array when cards are empty', () => {
    expect(detectStaleEntries([], [makeEntry('c1')])).toEqual([])
  })

  it('returns empty array when index entries are empty', () => {
    expect(detectStaleEntries([makeCard('c1')], [])).toEqual([])
  })

  it('detects a stale card when contentHash differs', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-new')],
      [makeEntry('c1', 'hash-old')],
    )
    expect(result).toEqual([{ cardId: 'c1', reason: 'stale' }])
  })

  it('ignores a non-stale card when contentHash matches and it has links', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-same')],
      [makeEntry('c1', 'hash-same')],
      [makeLink('c1', 'c2')],
    )
    expect(result).toEqual([])
  })

  it('detects an orphan card with zero links', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-same')],
      [makeEntry('c1', 'hash-same')],
      [],
    )
    expect(result).toEqual([{ cardId: 'c1', reason: 'orphan' }])
  })

  it('does not flag a card as orphan when it appears as a link source', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-same')],
      [makeEntry('c1', 'hash-same')],
      [makeLink('c1', 'c2')],
    )
    expect(result).toEqual([])
  })

  it('does not flag a card as orphan when it appears as a link target', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-same')],
      [makeEntry('c1', 'hash-same')],
      [makeLink('c2', 'c1')],
    )
    expect(result).toEqual([])
  })

  it('returns stale before orphan check: stale card wins over orphan', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-new')],
      [makeEntry('c1', 'hash-old')],
      [],
    )
    expect(result).toEqual([{ cardId: 'c1', reason: 'stale' }])
  })

  it('handles mixed stale and orphan across multiple cards', () => {
    const cards = [makeCard('c1', 'hash-new'), makeCard('c2', 'hash-same')]
    const entries = [makeEntry('c1', 'hash-old'), makeEntry('c2', 'hash-same')]
    const result = detectStaleEntries(cards, entries, [])
    expect(result).toEqual([
      { cardId: 'c1', reason: 'stale' },
      { cardId: 'c2', reason: 'orphan' },
    ])
  })

  it('does not flag cards not in the index', () => {
    const result = detectStaleEntries(
      [makeCard('c1', 'hash-a'), makeCard('c2', 'hash-b')],
      [makeEntry('c1', 'hash-a')],
      [],
    )
    expect(result).toHaveLength(1)
    expect(result[0].cardId).toBe('c1')
  })
})
