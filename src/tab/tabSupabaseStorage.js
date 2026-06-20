export function makeTabSupabaseStorage(client) {
  async function fetchSavedTabsForUser(userId) {
    const { data, error } = await client
      .from('user_tabs')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return data ?? []
  }

  async function upsertSavedTab(row) {
    const { error } = await client
      .from('user_tabs')
      .upsert(row, { onConflict: 'id' })
    if (error) throw error
  }

  async function deleteSavedTab(tabId) {
    const { error } = await client
      .from('user_tabs')
      .delete()
      .eq('id', tabId)
    if (error) throw error
  }

  return { fetchSavedTabsForUser, upsertSavedTab, deleteSavedTab }
}
