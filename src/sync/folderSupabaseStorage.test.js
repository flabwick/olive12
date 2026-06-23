import { describe, expect, it, vi } from 'vitest'
import { makeFolderSupabaseStorage } from './folderSupabaseStorage'

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

describe('makeFolderSupabaseStorage', () => {
  describe('fetchRemoteFoldersForUser', () => {
    it('queries folders table filtered by user_id and returns data', async () => {
      const folders = [{ id: 'f1', name: 'Work', parent_id: null, user_id: 'user-1' }]
      const { from, _mocks } = makeClient({ data: folders })
      const storage = makeFolderSupabaseStorage({ from })

      const result = await storage.fetchRemoteFoldersForUser('user-1')

      expect(from).toHaveBeenCalledWith('folders')
      expect(_mocks.selectFn).toHaveBeenCalledWith('*')
      expect(_mocks.eqFn).toHaveBeenCalledWith('user_id', 'user-1')
      expect(result).toEqual(folders)
    })

    it('returns empty array when data is null', async () => {
      const { from } = makeClient({ data: null })
      const storage = makeFolderSupabaseStorage({ from })
      const result = await storage.fetchRemoteFoldersForUser('user-1')
      expect(result).toEqual([])
    })

    it('throws when Supabase returns an error', async () => {
      const { from } = makeClient({ data: null, error: { message: 'DB error' } })
      const storage = makeFolderSupabaseStorage({ from })
      await expect(storage.fetchRemoteFoldersForUser('user-1')).rejects.toEqual({ message: 'DB error' })
    })
  })

  describe('upsertRemoteFolder', () => {
    it('upserts to folders table with id conflict target', async () => {
      const { from, _mocks } = makeClient()
      const storage = makeFolderSupabaseStorage({ from })

      const row = {
        id: 'f1',
        user_id: 'user-1',
        name: 'Work',
        parent_id: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      }

      await storage.upsertRemoteFolder(row)

      expect(from).toHaveBeenCalledWith('folders')
      expect(_mocks.upsertFn).toHaveBeenCalledWith(row, { onConflict: 'id' })
    })

    it('throws when Supabase returns an error', async () => {
      const { from } = makeClient({ error: { message: 'upsert failed' } })
      const storage = makeFolderSupabaseStorage({ from })
      await expect(storage.upsertRemoteFolder({})).rejects.toEqual({ message: 'upsert failed' })
    })
  })

  describe('deleteRemoteFolder', () => {
    it('deletes from folders table by id', async () => {
      const { from, _mocks } = makeClient()
      const storage = makeFolderSupabaseStorage({ from })

      await storage.deleteRemoteFolder('f1')

      expect(from).toHaveBeenCalledWith('folders')
      expect(_mocks.deleteFn).toHaveBeenCalled()
      expect(_mocks.deleteEqFn).toHaveBeenCalledWith('id', 'f1')
    })

    it('throws when Supabase returns an error', async () => {
      const { from } = makeClient({ error: { message: 'delete failed' } })
      const storage = makeFolderSupabaseStorage({ from })
      await expect(storage.deleteRemoteFolder('f1')).rejects.toEqual({ message: 'delete failed' })
    })
  })
})
