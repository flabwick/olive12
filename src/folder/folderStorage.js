import { db } from '../db/vaultDb'

export async function getAllFolders() {
  return db.folders.toArray()
}

export async function putFolder(folder) {
  await db.folders.put({ ...folder, dirty: true })
}

export async function deleteFolder(folderId) {
  await db.folders.delete(folderId)
}

export async function getDirtyFolders() {
  const all = await db.folders.toArray()
  return all.filter((f) => f.dirty)
}

export async function markFolderClean(folderId, mergedFolder) {
  await db.folders.put({ ...mergedFolder, id: folderId, dirty: false })
}
