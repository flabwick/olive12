import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { createIndexEntry } from './createIndexEntry'
import { putIndexEntry } from './indexEntryStorage'
import { indexCard } from './indexCard'

const invokeMock = vi.hoisted(() => vi.fn())
const upsertMock = vi.hoisted(() => vi.fn().mockResolvedValue({ error: null }))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    functions: { invoke: invokeMock },
    from: vi.fn(() => ({ upsert: upsertMock })),
  },
}))

describe('indexCard', () => {
  beforeEach(async () => {
    await db.index_entries.clear()
    invokeMock.mockReset()
    upsertMock.mockClear()
  })

  it('calls wiki-index with the card and neighbor entries, then stores the result', async () => {
    await putIndexEntry(createIndexEntry({ cardId: 'neighbor-1', title: 'Neighbor' }))
    invokeMock.mockResolvedValue({
      data: { title: 'Indexed title', tags: ['note'], summary: 'A summary.', links: [] },
      error: null,
    })

    const card = { id: 'card-1', type: 'text', title: 'My note', body: 'Content here', location: 'library', config: null }
    const entry = await indexCard(card)

    expect(invokeMock).toHaveBeenCalledWith('wiki-index', {
      body: {
        card,
        neighborEntries: [expect.objectContaining({ cardId: 'neighbor-1', title: 'Neighbor' })],
      },
    })
    expect(entry).toMatchObject({
      cardId: 'card-1',
      title: 'Indexed title',
      tags: ['note'],
      summary: 'A summary.',
    })
    const stored = await db.index_entries.get('card-1')
    expect(stored?.summary).toBe('A summary.')
  })

  it('excludes the card being indexed from neighbor entries', async () => {
    await putIndexEntry(createIndexEntry({ cardId: 'card-1', title: 'Self' }))
    invokeMock.mockResolvedValue({
      data: { title: 'T', tags: [], summary: 'S', links: [] },
      error: null,
    })

    await indexCard({ id: 'card-1', title: 'My note', body: 'Body', location: 'library' })

    const neighbors = invokeMock.mock.calls[0][1].body.neighborEntries
    expect(neighbors).toEqual([])
  })

  it('upserts to Supabase when userId is provided', async () => {
    invokeMock.mockResolvedValue({
      data: { title: 'T', tags: [], summary: 'S', links: [] },
      error: null,
    })

    await indexCard({ id: 'card-1', title: 'Note', body: 'Body', location: 'library' }, { userId: 'user-1' })

    expect(upsertMock).toHaveBeenCalledWith(expect.objectContaining({
      card_id: 'card-1',
      user_id: 'user-1',
      summary: 'S',
    }))
  })

  it('throws when wiki-index returns an error', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('invoke failed') })
    await expect(indexCard({ id: 'card-1', title: 'X', body: '', location: 'library' }))
      .rejects.toThrow('invoke failed')
  })

  it('throws when response body contains an error field', async () => {
    invokeMock.mockResolvedValue({
      data: { error: 'OPENROUTER_API_KEY not configured' },
      error: null,
    })
    await expect(indexCard({ id: 'card-1', title: 'X', body: '', location: 'library' }))
      .rejects.toThrow('OPENROUTER_API_KEY not configured')
  })

  it('still returns entry when Supabase upsert fails', async () => {
    upsertMock.mockResolvedValue({ error: new Error('RLS denied') })
    invokeMock.mockResolvedValue({
      data: { title: 'T', tags: [], summary: 'Saved locally', links: [] },
      error: null,
    })

    const entry = await indexCard({ id: 'card-1', title: 'Note', body: 'Body', location: 'library' }, { userId: 'user-1' })
    expect(entry.summary).toBe('Saved locally')
  })

  it('falls back to card body when LLM returns empty summary', async () => {
    invokeMock.mockResolvedValue({
      data: { title: 'Charles Darwin', tags: ['biology'], summary: '', links: [] },
      error: null,
    })

    const entry = await indexCard({
      id: 'card-1',
      title: 'Charles Darwin',
      body: 'Charles Robert Darwin was a British naturalist. He proposed natural selection.',
      location: 'library',
    })

    expect(entry.summary).toContain('Charles Robert Darwin')
  })

  it('refuses to index non-library cards', async () => {
    await expect(indexCard({
      id: 'card-1',
      title: 'Note',
      body: 'Body',
      location: 'shelf',
    })).rejects.toThrow('location "library"')
    expect(invokeMock).not.toHaveBeenCalled()
  })
})
