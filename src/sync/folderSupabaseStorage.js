export function makeFolderSupabaseStorage(client) {
  async function fetchRemoteFoldersForUser(userId) {
    const { data, error } = await client
      .from('folders')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  }

  async function upsertRemoteFolder(row) {
    const { error } = await client
      .from('folders')
      .upsert(row, { onConflict: 'id' })
    if (error) throw error
  }

  async function deleteRemoteFolder(folderId) {
    const { error } = await client
      .from('folders')
      .delete()
      .eq('id', folderId)
    if (error) throw error
  }

  return { fetchRemoteFoldersForUser, upsertRemoteFolder, deleteRemoteFolder }
}
