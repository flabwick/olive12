import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/vaultDb'
import { deleteFolder, getAllFolders, getDirtyFolders, markFolderClean, putFolder } from './folderStorage'

describe('folderStorage', () => {
  beforeEach(async () => {
    await db.folders.clear()
  })

  it('getAllFolders returns empty array when no folders', async () => {
    const folders = await getAllFolders()
    expect(folders).toEqual([])
  })

  it('putFolder stores a folder and getAllFolders retrieves it', async () => {
    const folder = { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }
    await putFolder(folder)
    const result = await getAllFolders()
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('f1')
    expect(result[0].name).toBe('Work')
  })

  it('putFolder upserts (no duplicates)', async () => {
    const folder = { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }
    await putFolder(folder)
    await putFolder({ ...folder, name: 'Work Updated' })
    const result = await getAllFolders()
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('Work Updated')
  })

  it('deleteFolder removes the folder', async () => {
    const folder = { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }
    await putFolder(folder)
    await deleteFolder('f1')
    const result = await getAllFolders()
    expect(result).toHaveLength(0)
  })

  it('round-trips parentId', async () => {
    const folder = { id: 'f2', name: 'Projects', parentId: 'f1', createdAt: 1, updatedAt: 1 }
    await putFolder(folder)
    const [result] = await getAllFolders()
    expect(result.parentId).toBe('f1')
  })

  it('putFolder writes dirty: true on every upsert', async () => {
    const folder = { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }
    await putFolder(folder)
    const [result] = await getAllFolders()
    expect(result.dirty).toBe(true)
  })

  it('getDirtyFolders returns only folders with dirty: true', async () => {
    await putFolder({ id: 'f1', name: 'Dirty', parentId: null, createdAt: 1, updatedAt: 1 })
    await db.folders.put({ id: 'f2', name: 'Clean', parentId: null, createdAt: 1, updatedAt: 1, dirty: false })
    const dirty = await getDirtyFolders()
    expect(dirty).toHaveLength(1)
    expect(dirty[0].id).toBe('f1')
  })

  it('getDirtyFolders returns empty array when no dirty folders', async () => {
    await db.folders.put({ id: 'f1', name: 'Clean', parentId: null, createdAt: 1, updatedAt: 1, dirty: false })
    const dirty = await getDirtyFolders()
    expect(dirty).toHaveLength(0)
  })

  it('markFolderClean sets dirty to false and merges folder data', async () => {
    await putFolder({ id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 })
    const [before] = await getAllFolders()
    expect(before.dirty).toBe(true)

    await markFolderClean('f1', { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 2 })
    const [after] = await getAllFolders()
    expect(after.dirty).toBe(false)
    expect(after.updatedAt).toBe(2)
  })
})
