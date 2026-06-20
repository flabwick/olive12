import { describe, expect, it, vi } from 'vitest'
import { makeTabSupabaseStorage } from './tabSupabaseStorage'

function makeClient({ data = [], error = null } = {}) {
  const eqFn = vi.fn().mockResolvedValue({ data, error })
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
  const deleteEqFn = vi.fn().mockResolvedValue({ error })
  const deleteFn = vi.fn().mockReturnValue({ eq: deleteEqFn })
  const upsertFn = vi.fn().mockResolvedValue({ error })
  const fromFn = vi.fn().mockReturnValue({
    select: selectFn,
    upsert: upsertFn,
    delete: deleteFn,
  })
  return { from: fromFn, _mocks: { eqFn, selectFn, deleteEqFn, deleteFn, upsertFn } }
}

describe('makeTabSupabaseStorage', () => {
  describe('fetchSavedTabsForUser', () => {
    it('queries user_tabs filtered by userId and returns data', async () => {
      const tabs = [
        { id: 'tab-1', name: 'Research', saved_location: 'shelf', card_ids: ['c1'] },
      ]
      const { from, _mocks } = makeClient({ data: tabs })
      const storage = makeTabSupabaseStorage({ from })

      const result = await storage.fetchSavedTabsForUser('user-1')

      expect(from).toHaveBeenCalledWith('user_tabs')
      expect(_mocks.selectFn).toHaveBeenCalledWith('*')
      expect(_mocks.eqFn).toHaveBeenCalledWith('user_id', 'user-1')
      expect(result).toEqual(tabs)
    })

    it('returns empty array when data is null', async () => {
      const { from } = makeClient({ data: null })
      const storage = makeTabSupabaseStorage({ from })
      const result = await storage.fetchSavedTabsForUser('user-1')
      expect(result).toEqual([])
    })

    it('throws when Supabase returns an error', async () => {
      const { from } = makeClient({ data: null, error: { message: 'DB error' } })
      const storage = makeTabSupabaseStorage({ from })
      await expect(storage.fetchSavedTabsForUser('user-1')).rejects.toEqual({ message: 'DB error' })
    })
  })

  describe('upsertSavedTab', () => {
    it('upserts a row to user_tabs with id conflict target', async () => {
      const { from, _mocks } = makeClient()
      const storage = makeTabSupabaseStorage({ from })

      const row = {
        id: 'tab-1',
        user_id: 'user-1',
        name: 'Research',
        saved_location: 'shelf',
        saved_folder_id: null,
        card_ids: ['c1', 'c2'],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      }

      await storage.upsertSavedTab(row)

      expect(from).toHaveBeenCalledWith('user_tabs')
      expect(_mocks.upsertFn).toHaveBeenCalledWith(row, { onConflict: 'id' })
    })

    it('throws when Supabase returns an error', async () => {
      const { from } = makeClient({ error: { message: 'upsert failed' } })
      const storage = makeTabSupabaseStorage({ from })
      await expect(storage.upsertSavedTab({})).rejects.toEqual({ message: 'upsert failed' })
    })
  })

  describe('deleteSavedTab', () => {
    it('deletes from user_tabs by id', async () => {
      const { from, _mocks } = makeClient()
      const storage = makeTabSupabaseStorage({ from })

      await storage.deleteSavedTab('tab-1')

      expect(from).toHaveBeenCalledWith('user_tabs')
      expect(_mocks.deleteFn).toHaveBeenCalled()
      expect(_mocks.deleteEqFn).toHaveBeenCalledWith('id', 'tab-1')
    })

    it('throws when Supabase returns an error', async () => {
      const { from } = makeClient({ error: { message: 'delete failed' } })
      const storage = makeTabSupabaseStorage({ from })
      await expect(storage.deleteSavedTab('tab-1')).rejects.toEqual({ message: 'delete failed' })
    })
  })
})
