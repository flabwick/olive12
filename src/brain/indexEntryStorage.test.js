import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { createIndexEntry } from './createIndexEntry'
import {
  deleteIndexEntry,
  getAllIndexEntries,
  getIndexEntry,
  putIndexEntry,
  searchIndexEntries,
} from './indexEntryStorage'

describe('indexEntryStorage', () => {
  beforeEach(async () => {
    await db.index_entries.clear()
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns empty array when no entries exist', async () => {
    expect(await getAllIndexEntries()).toEqual([])
  })

  it('putIndexEntry stores an entry and getAllIndexEntries retrieves it', async () => {
    const entry = createIndexEntry({ cardId: 'c1', title: 'Hello' })
    await putIndexEntry(entry)
    const all = await getAllIndexEntries()
    expect(all).toHaveLength(1)
    expect(all[0]).toMatchObject({ cardId: 'c1', title: 'Hello' })
  })

  it('getIndexEntry returns the entry for a known cardId', async () => {
    const entry = createIndexEntry({ cardId: 'c2', title: 'World' })
    await putIndexEntry(entry)
    const found = await getIndexEntry('c2')
    expect(found).toMatchObject({ cardId: 'c2', title: 'World' })
  })

  it('getIndexEntry returns undefined for an unknown cardId', async () => {
    expect(await getIndexEntry('missing')).toBeUndefined()
  })

  it('putIndexEntry upserts — updating an existing entry without creating a duplicate', async () => {
    const entry = createIndexEntry({ cardId: 'c3', title: 'Old' })
    await putIndexEntry(entry)
    await putIndexEntry({ ...entry, title: 'New' })
    const all = await getAllIndexEntries()
    expect(all).toHaveLength(1)
    expect(all[0].title).toBe('New')
  })

  it('deleteIndexEntry removes the entry by cardId', async () => {
    const entry = createIndexEntry({ cardId: 'c4' })
    await putIndexEntry(entry)
    await deleteIndexEntry('c4')
    expect(await getAllIndexEntries()).toEqual([])
  })

  describe('searchIndexEntries', () => {
    beforeEach(async () => {
      let t = 1_700_000_000_000
      vi.spyOn(Date, 'now').mockImplementation(() => t++)

      await putIndexEntry(createIndexEntry({ cardId: 'c-title', title: 'React Hooks Guide', tags: [], summary: '' }))
      await putIndexEntry(createIndexEntry({ cardId: 'c-tag', title: 'Some Note', tags: ['typescript', 'frontend'], summary: '' }))
      await putIndexEntry(createIndexEntry({ cardId: 'c-summary', title: 'Another', tags: [], summary: 'This covers async patterns' }))
      await putIndexEntry(createIndexEntry({ cardId: 'c-none', title: 'Unrelated', tags: ['cooking'], summary: 'Recipes only' }))
    })

    it('matches on title', async () => {
      const results = await searchIndexEntries('hooks')
      expect(results.map((e) => e.cardId)).toContain('c-title')
    })

    it('matches on tags', async () => {
      const results = await searchIndexEntries('typescript')
      expect(results.map((e) => e.cardId)).toContain('c-tag')
    })

    it('matches on summary', async () => {
      const results = await searchIndexEntries('async')
      expect(results.map((e) => e.cardId)).toContain('c-summary')
    })

    it('returns empty array when no entry matches', async () => {
      const results = await searchIndexEntries('zzznomatch')
      expect(results).toEqual([])
    })

    it('is case-insensitive', async () => {
      const lower = await searchIndexEntries('react')
      const upper = await searchIndexEntries('REACT')
      expect(lower.map((e) => e.cardId)).toEqual(upper.map((e) => e.cardId))
      expect(lower.map((e) => e.cardId)).toContain('c-title')
    })

    it('returns results sorted by updatedAt descending', async () => {
      const results = await searchIndexEntries('e')
      const timestamps = results.map((e) => e.updatedAt)
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a))
    })
  })
})
