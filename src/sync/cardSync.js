import { getDirtyCards, markCardClean } from '../card/cardStorage'
import { computeContentHash, resolveCardConflict } from './cardSyncLogic'

function localToRemote(card, userId) {
  return {
    id: card.id,
    user_id: userId,
    type: card.type,
    subtype: null,
    title: card.title,
    body: { kind: 'plain', text: card.body },
    config: {},
    location: card.location,
    content_hash: computeContentHash(card),
    created_at: new Date(card.createdAt).toISOString(),
    updated_at: new Date(card.updatedAt).toISOString(),
  }
}

function remoteToLocal(row) {
  const bodyText =
    row.body && typeof row.body === 'object' && row.body.kind === 'plain'
      ? row.body.text
      : String(row.body ?? '')
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: bodyText,
    location: row.location,
    // folderId is local-only in this slice; not stored in Supabase
    folderId: null,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    content_hash: row.content_hash,
  }
}

export async function syncDirtyCardsForUser(userId, storage) {
  const dirtyCards = await getDirtyCards()

  for (const card of dirtyCards) {
    try {
      const hash = computeContentHash(card)
      const cardWithHash = { ...card, content_hash: hash }
      const remote = await storage.fetchRemoteCardById(userId, card.id)
      const { action } = resolveCardConflict(cardWithHash, remote)

      if (action === 'NOOP') {
        await markCardClean(card.id, cardWithHash)
      } else if (action === 'PUSH_LOCAL') {
        await storage.upsertRemoteCard(localToRemote(card, userId))
        await markCardClean(card.id, cardWithHash)
      } else if (action === 'PULL_REMOTE') {
        await markCardClean(card.id, remoteToLocal(remote))
      }
    } catch (err) {
      console.error(`Sync failed for card ${card.id}:`, err)
    }
  }
}

export function createCardSyncScheduler({ userId, debounceMs = 3000, storage }) {
  let timer = null

  function scheduleSync() {
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      syncDirtyCardsForUser(userId, storage).catch((err) => {
        console.error('Scheduled sync error:', err)
      })
    }, debounceMs)
  }

  async function runNow() {
    clearTimeout(timer)
    timer = null
    await syncDirtyCardsForUser(userId, storage)
  }

  return { scheduleSync, runNow }
}
