import { beforeEach, describe, expect, it, vi } from 'vitest'
import { diffLinks, extractLinks, isOrphan } from './linkLogic'

describe('extractLinks', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  it('returns empty array for a text card with no body', () => {
    const card = { id: 'c1', type: 'text', body: '', config: null }
    expect(extractLinks(card)).toEqual([])
  })

  it('returns empty array for a text card with plain body (no embed syntax)', () => {
    const card = { id: 'c1', type: 'text', body: 'Hello world', config: null }
    expect(extractLinks(card)).toEqual([])
  })

  it('extracts a portal link from a portal card', () => {
    const card = { id: 'c1', type: 'portal', config: { target_card_id: 'c2' } }
    expect(extractLinks(card)).toEqual([
      { sourceCardId: 'c1', targetCardId: 'c2', linkType: 'portal', createdAt: 1_700_000_000_000 },
    ])
  })

  it('returns empty array for portal card with null config', () => {
    const card = { id: 'c1', type: 'portal', config: null }
    expect(extractLinks(card)).toEqual([])
  })

  it('returns empty array for portal card with missing target_card_id', () => {
    const card = { id: 'c1', type: 'portal', config: {} }
    expect(extractLinks(card)).toEqual([])
  })

  it('extracts [[cardId]] embed links from text card body', () => {
    const card = { id: 'c1', type: 'text', body: 'See [[c2]] and [[c3]]', config: null }
    const links = extractLinks(card)
    expect(links).toHaveLength(2)
    expect(links[0]).toEqual({ sourceCardId: 'c1', targetCardId: 'c2', linkType: 'embed', createdAt: 1_700_000_000_000 })
    expect(links[1]).toEqual({ sourceCardId: 'c1', targetCardId: 'c3', linkType: 'embed', createdAt: 1_700_000_000_000 })
  })

  it('does not extract portal links from a text card', () => {
    const card = { id: 'c1', type: 'text', body: 'no links', config: { target_card_id: 'c2' } }
    expect(extractLinks(card)).toEqual([])
  })
})

describe('diffLinks', () => {
  const base = { sourceCardId: 'c1', linkType: 'portal', createdAt: 0 }

  it('returns empty toAdd and toRemove when both are empty', () => {
    expect(diffLinks([], [])).toEqual({ toAdd: [], toRemove: [] })
  })

  it('all new links go into toAdd when existing is empty', () => {
    const newLinks = [{ ...base, targetCardId: 'c2' }]
    const { toAdd, toRemove } = diffLinks([], newLinks)
    expect(toAdd).toHaveLength(1)
    expect(toAdd[0].targetCardId).toBe('c2')
    expect(toRemove).toHaveLength(0)
  })

  it('all existing links go into toRemove when new is empty', () => {
    const existing = [{ ...base, targetCardId: 'c2' }]
    const { toAdd, toRemove } = diffLinks(existing, [])
    expect(toAdd).toHaveLength(0)
    expect(toRemove).toHaveLength(1)
    expect(toRemove[0].targetCardId).toBe('c2')
  })

  it('shared targets appear in neither toAdd nor toRemove', () => {
    const link = { ...base, targetCardId: 'c2' }
    const { toAdd, toRemove } = diffLinks([link], [link])
    expect(toAdd).toHaveLength(0)
    expect(toRemove).toHaveLength(0)
  })

  it('correctly partitions added and removed links', () => {
    const existing = [
      { ...base, targetCardId: 'c2' },
      { ...base, targetCardId: 'c3' },
    ]
    const newLinks = [
      { ...base, targetCardId: 'c3' },
      { ...base, targetCardId: 'c4' },
    ]
    const { toAdd, toRemove } = diffLinks(existing, newLinks)
    expect(toAdd.map((l) => l.targetCardId)).toEqual(['c4'])
    expect(toRemove.map((l) => l.targetCardId)).toEqual(['c2'])
  })
})

describe('isOrphan', () => {
  it('returns true when allLinks is empty', () => {
    expect(isOrphan('c1', [])).toBe(true)
  })

  it('returns false when card is a source', () => {
    const links = [{ sourceCardId: 'c1', targetCardId: 'c2' }]
    expect(isOrphan('c1', links)).toBe(false)
  })

  it('returns false when card is a target', () => {
    const links = [{ sourceCardId: 'c2', targetCardId: 'c1' }]
    expect(isOrphan('c1', links)).toBe(false)
  })

  it('returns true when card has no source or target entries', () => {
    const links = [{ sourceCardId: 'c2', targetCardId: 'c3' }]
    expect(isOrphan('c1', links)).toBe(true)
  })
})
