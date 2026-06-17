import { db } from '../db/vaultDb'

export async function getAllFolders() {
  return db.folders.toArray()
}

export async function putFolder(folder) {
  await db.folders.put(folder)
}

export async function deleteFolder(folderId) {
  await db.folders.delete(folderId)
}
