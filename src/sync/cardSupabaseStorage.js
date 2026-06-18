export function makeCardSupabaseStorage(client) {
  async function fetchRemoteCardsForUser(userId) {
    const { data, error } = await client
      .from('cards')
      .select('*')
      .eq('user_id', userId)
    if (error) throw error
    return data
  }

  async function upsertRemoteCard(cardRow) {
    const { data, error } = await client
      .from('cards')
      .upsert(cardRow, { onConflict: 'id' })
      .select()
      .single()
    if (error) throw error
    return data
  }

  async function fetchRemoteCardById(userId, cardId) {
    const { data, error } = await client
      .from('cards')
      .select('*')
      .eq('user_id', userId)
      .eq('id', cardId)
      .maybeSingle()
    if (error) throw error
    return data
  }

  return { fetchRemoteCardsForUser, upsertRemoteCard, fetchRemoteCardById }
}
