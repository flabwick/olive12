import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { getAllFolders, putFolder } from '../folder/folderStorage'
import { deleteFolderRemote, syncFolders } from './folderSync'

function makeStorage(overrides = {}) {
  return {
    fetchRemoteFoldersForUser: vi.fn().mockResolvedValue([]),
    upsertRemoteFolder: vi.fn().mockResolvedValue(undefined),
    deleteRemoteFolder: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('syncFolders', () => {
  beforeEach(async () => {
    await db.folders.clear()
  })

  it('pull remote-only: upserts remote folder into Dexie with dirty: false', async () => {
    const remoteRow = {
      id: 'rf1',
      name: 'Remote Work',
      parent_id: null,
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }
    const storage = makeStorage({
      fetchRemoteFoldersForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    await syncFolders('user-1', storage)

    const folders = await getAllFolders()
    expect(folders).toHaveLength(1)
    expect(folders[0].id).toBe('rf1')
    expect(folders[0].name).toBe('Remote Work')
    expect(folders[0].parentId).toBeNull()
    expect(folders[0].dirty).toBe(false)
  })

  it('push dirty local: pushes dirty folders to remote and marks them clean', async () => {
    await putFolder({ id: 'f1', name: 'Local Work', parentId: null, createdAt: 1_000, updatedAt: 1_000 })

    const storage = makeStorage()
    await syncFolders('user-1', storage)

    expect(storage.upsertRemoteFolder).toHaveBeenCalledOnce()
    const upserted = storage.upsertRemoteFolder.mock.calls[0][0]
    expect(upserted.id).toBe('f1')
    expect(upserted.user_id).toBe('user-1')
    expect(upserted.name).toBe('Local Work')
    expect(upserted.parent_id).toBeNull()

    const folders = await getAllFolders()
    expect(folders[0].dirty).toBe(false)
  })

  it('does not overwrite a dirty local folder during pull — local changes take precedence', async () => {
    // Simulates a rename that has not yet been pushed to the server
    await putFolder({ id: 'f1', name: 'Renamed Locally', parentId: null, createdAt: 1_000, updatedAt: 2_000 })

    const remoteRow = {
      id: 'f1',
      name: 'Old Server Name',
      parent_id: null,
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }
    const storage = makeStorage({
      fetchRemoteFoldersForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    await syncFolders('user-1', storage)

    // Dirty local folder must NOT be overwritten
    const folders = await getAllFolders()
    expect(folders[0].name).toBe('Renamed Locally')
    // And it should have been pushed to the server
    expect(storage.upsertRemoteFolder).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'f1', name: 'Renamed Locally' }),
    )
  })

  it('overwrites a clean local folder when remote is newer', async () => {
    await db.folders.put({ id: 'f1', name: 'Old Local', parentId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false })

    const remoteRow = {
      id: 'f1',
      name: 'Newer Server Name',
      parent_id: null,
      user_id: 'user-1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-02T00:00:00Z',
    }
    const storage = makeStorage({
      fetchRemoteFoldersForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    await syncFolders('user-1', storage)

    const folders = await getAllFolders()
    expect(folders[0].name).toBe('Newer Server Name')
    expect(folders[0].dirty).toBe(false)
    expect(storage.upsertRemoteFolder).not.toHaveBeenCalled()
  })

  it('pull error is non-blocking: does not throw and continues to push phase', async () => {
    await putFolder({ id: 'f1', name: 'Dirty', parentId: null, createdAt: 1_000, updatedAt: 1_000 })
    const storage = makeStorage({
      fetchRemoteFoldersForUser: vi.fn().mockRejectedValue(new Error('Network error')),
    })

    await expect(syncFolders('user-1', storage)).resolves.toBeUndefined()
    // Push still ran despite pull error
    expect(storage.upsertRemoteFolder).toHaveBeenCalledOnce()
  })

  it('push error is non-blocking: continues and does not throw', async () => {
    await putFolder({ id: 'f1', name: 'Dirty', parentId: null, createdAt: 1_000, updatedAt: 1_000 })
    const storage = makeStorage({
      upsertRemoteFolder: vi.fn().mockRejectedValue(new Error('Push failed')),
    })

    await expect(syncFolders('user-1', storage)).resolves.toBeUndefined()
  })

  it('does not push clean folders', async () => {
    await db.folders.put({ id: 'f1', name: 'Clean', parentId: null, createdAt: 1, updatedAt: 1, dirty: false })
    const storage = makeStorage()

    await syncFolders('user-1', storage)

    expect(storage.upsertRemoteFolder).not.toHaveBeenCalled()
  })
})

describe('deleteFolderRemote', () => {
  it('calls deleteRemoteFolder on storage with folderId', async () => {
    const storage = makeStorage()
    await deleteFolderRemote('f1', 'user-1', storage)
    expect(storage.deleteRemoteFolder).toHaveBeenCalledWith('f1')
  })

  it('does not throw when deleteRemoteFolder errors', async () => {
    const storage = makeStorage({
      deleteRemoteFolder: vi.fn().mockRejectedValue(new Error('Failed')),
    })
    await expect(deleteFolderRemote('f1', 'user-1', storage)).resolves.toBeUndefined()
  })
})
