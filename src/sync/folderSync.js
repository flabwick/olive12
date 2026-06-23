import { getDirtyFolders, markFolderClean } from '../folder/folderStorage'
import { db } from '../db/vaultDb'

export async function syncFolders(userId, storage) {
  // Pull: remote wins only when local has no unsynced changes and remote is newer
  try {
    const remoteFolders = await storage.fetchRemoteFoldersForUser(userId)
    for (const row of remoteFolders) {
      const existing = await db.folders.get(row.id)
      if (existing?.dirty) continue
      const remoteUpdatedAt = new Date(row.updated_at).getTime()
      if (existing && existing.updatedAt >= remoteUpdatedAt) continue
      await db.folders.put({
        id: row.id,
        name: row.name,
        parentId: row.parent_id ?? null,
        createdAt: new Date(row.created_at).getTime(),
        updatedAt: remoteUpdatedAt,
        dirty: false,
      })
    }
  } catch (err) {
    if (err?.code !== 'PGRST205') console.error('[folderSync] pull error:', err)
  }

  // Push: upsert dirty local folders to remote, then mark clean
  try {
    const dirty = await getDirtyFolders()
    for (const folder of dirty) {
      try {
        await storage.upsertRemoteFolder({
          id: folder.id,
          user_id: userId,
          name: folder.name,
          parent_id: folder.parentId ?? null,
          created_at: new Date(folder.createdAt).toISOString(),
          updated_at: new Date(folder.updatedAt).toISOString(),
        })
        await markFolderClean(folder.id, folder)
      } catch (err) {
        if (err?.code !== 'PGRST205') console.error(`[folderSync] push error for folder ${folder.id}:`, err)
      }
    }
  } catch (err) {
    if (err?.code !== 'PGRST205') console.error('[folderSync] push phase error:', err)
  }
}

export async function deleteFolderRemote(folderId, userId, storage) {
  try {
    await storage.deleteRemoteFolder(folderId)
  } catch (err) {
    console.error(`[folderSync] delete remote error for folder ${folderId}:`, err)
  }
}
