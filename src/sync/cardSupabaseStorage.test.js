import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeCardSupabaseStorage } from './cardSupabaseStorage'

function makeFakeClient(overrides = {}) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  }
  const from = vi.fn(() => chain)
  return { from, chain, ...overrides }
}

describe('makeCardSupabaseStorage', () => {
  let client
  let chain
  let storage

  beforeEach(() => {
    const fake = makeFakeClient()
    client = fake
    chain = fake.chain
    storage = makeCardSupabaseStorage(client)
  })

  describe('fetchRemoteCardsForUser', () => {
    it('queries the cards table filtered by user_id', async () => {
      chain.eq.mockReturnThis()
      chain.select.mockReturnThis()
      // final call returns data
      chain.eq.mockImplementationOnce(() => ({ ...chain, data: [{ id: 'c1' }], error: null }))

      // Actually maybeSingle is not called here; the chain ends with .eq
      // Let me build a proper mock chain
      const rows = [{ id: 'c1', user_id: 'u1' }]
      const finalChain = { data: rows, error: null }
      chain.select.mockReturnValueOnce({ eq: vi.fn(() => finalChain) })

      const result = await storage.fetchRemoteCardsForUser('u1')
      expect(client.from).toHaveBeenCalledWith('cards')
      expect(result).toEqual(rows)
    })

    it('throws when Supabase returns an error', async () => {
      const finalChain = { data: null, error: new Error('DB error') }
      chain.select.mockReturnValueOnce({ eq: vi.fn(() => finalChain) })

      await expect(storage.fetchRemoteCardsForUser('u1')).rejects.toThrow('DB error')
    })
  })

  describe('upsertRemoteCard', () => {
    it('upserts to the cards table with onConflict id', async () => {
      const returned = { id: 'c1', title: 'Test' }
      const singleChain = { data: returned, error: null }
      const selectChain = { single: vi.fn(() => singleChain) }
      const upsertChain = { select: vi.fn(() => selectChain) }
      chain.upsert.mockReturnValueOnce(upsertChain)

      const row = { id: 'c1', user_id: 'u1', title: 'Test' }
      const result = await storage.upsertRemoteCard(row)

      expect(client.from).toHaveBeenCalledWith('cards')
      expect(chain.upsert).toHaveBeenCalledWith(row, { onConflict: 'id' })
      expect(result).toEqual(returned)
    })

    it('throws when Supabase returns an error on upsert', async () => {
      const singleChain = { data: null, error: new Error('upsert failed') }
      const selectChain = { single: vi.fn(() => singleChain) }
      const upsertChain = { select: vi.fn(() => selectChain) }
      chain.upsert.mockReturnValueOnce(upsertChain)

      await expect(storage.upsertRemoteCard({ id: 'c1' })).rejects.toThrow('upsert failed')
    })
  })

  describe('fetchRemoteCardById', () => {
    it('queries cards table with user_id and id filters', async () => {
      const row = { id: 'c1', user_id: 'u1' }
      const maybeSingleResult = { data: row, error: null }
      const eq2Chain = { maybeSingle: vi.fn(() => maybeSingleResult) }
      const eq1Chain = { eq: vi.fn(() => eq2Chain) }
      chain.select.mockReturnValueOnce({ eq: vi.fn(() => eq1Chain) })

      const result = await storage.fetchRemoteCardById('u1', 'c1')
      expect(client.from).toHaveBeenCalledWith('cards')
      expect(result).toEqual(row)
    })

    it('returns null when card is not found', async () => {
      const maybeSingleResult = { data: null, error: null }
      const eq2Chain = { maybeSingle: vi.fn(() => maybeSingleResult) }
      const eq1Chain = { eq: vi.fn(() => eq2Chain) }
      chain.select.mockReturnValueOnce({ eq: vi.fn(() => eq1Chain) })

      const result = await storage.fetchRemoteCardById('u1', 'missing-id')
      expect(result).toBeNull()
    })

    it('throws when Supabase returns an error', async () => {
      const maybeSingleResult = { data: null, error: new Error('fetch failed') }
      const eq2Chain = { maybeSingle: vi.fn(() => maybeSingleResult) }
      const eq1Chain = { eq: vi.fn(() => eq2Chain) }
      chain.select.mockReturnValueOnce({ eq: vi.fn(() => eq1Chain) })

      await expect(storage.fetchRemoteCardById('u1', 'c1')).rejects.toThrow('fetch failed')
    })
  })
})
