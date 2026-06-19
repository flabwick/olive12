import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createIndexEntry } from './createIndexEntry'

describe('createIndexEntry', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates an entry with all default values when only cardId is given', () => {
    expect(createIndexEntry({ cardId: 'card-1' })).toEqual({
      cardId: 'card-1',
      title: '',
      tags: [],
      summary: '',
      links: [],
      contentHash: '',
      updatedAt: 1_700_000_000_000,
    })
  })

  it('stores custom title, tags, summary, links, and contentHash', () => {
    const entry = createIndexEntry({
      cardId: 'card-2',
      title: 'My Note',
      tags: ['react', 'hooks'],
      summary: 'A note about hooks',
      links: ['card-3', 'card-4'],
      contentHash: 'abc123',
    })
    expect(entry).toEqual({
      cardId: 'card-2',
      title: 'My Note',
      tags: ['react', 'hooks'],
      summary: 'A note about hooks',
      links: ['card-3', 'card-4'],
      contentHash: 'abc123',
      updatedAt: 1_700_000_000_000,
    })
  })

  it('uses cardId as the primary key — no separate id field', () => {
    const entry = createIndexEntry({ cardId: 'card-5' })
    expect(entry.cardId).toBe('card-5')
    expect(entry.id).toBeUndefined()
  })

  it('stamps updatedAt with Date.now()', () => {
    vi.spyOn(Date, 'now').mockReturnValue(9_999_999_999_999)
    const entry = createIndexEntry({ cardId: 'card-6' })
    expect(entry.updatedAt).toBe(9_999_999_999_999)
  })

  it('defaults tags to an empty array', () => {
    const entry = createIndexEntry({ cardId: 'card-7' })
    expect(entry.tags).toEqual([])
  })

  it('defaults links to an empty array', () => {
    const entry = createIndexEntry({ cardId: 'card-8' })
    expect(entry.links).toEqual([])
  })
})
