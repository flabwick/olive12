import { isOrphan } from '../card/linkLogic'
import { computeContentHash } from '../sync/cardSyncLogic'

/**
 * @typedef {{ cardId: string, title: string, reason: 'stale' | 'orphan' }} BrainFeedItem
 */

/**
 * @param {Record<string, import('../card/createCard').Card>} cardsById
 * @param {import('./createIndexEntry').IndexEntry[]} indexEntries
 * @returns {BrainFeedItem[]}
 */
export function getStaleEntries(cardsById, indexEntries) {
  const entriesByCardId = Object.fromEntries(indexEntries.map((e) => [e.cardId, e]))
  const items = []

  for (const card of Object.values(cardsById)) {
    if (card.location !== 'library') continue
    const entry = entriesByCardId[card.id]
    if (!entry) continue
    if (computeContentHash(card) !== entry.contentHash) {
      items.push({
        cardId: card.id,
        title: card.title || entry.title || '',
        reason: 'stale',
      })
    }
  }

  return items
}

/**
 * @param {Record<string, import('../card/createCard').Card>} cardsById
 * @param {import('../card/linkStorage').Link[]} allLinks
 * @returns {BrainFeedItem[]}
 */
export function getOrphanCards(cardsById, allLinks) {
  const items = []

  for (const card of Object.values(cardsById)) {
    if (card.location !== 'library') continue
    if (isOrphan(card.id, allLinks)) {
      items.push({
        cardId: card.id,
        title: card.title || '',
        reason: 'orphan',
      })
    }
  }

  return items
}

/**
 * @param {Record<string, import('../card/createCard').Card>} cardsById
 * @param {import('./createIndexEntry').IndexEntry[]} indexEntries
 * @param {import('../card/linkStorage').Link[]} allLinks
 * @returns {BrainFeedItem[]}
 */
export function getBrainFeedItems(cardsById, indexEntries, allLinks) {
  const stale = getStaleEntries(cardsById, indexEntries)
  const orphans = getOrphanCards(cardsById, allLinks)
  const byId = new Map()

  for (const item of orphans) {
    byId.set(item.cardId, item)
  }
  for (const item of stale) {
    byId.set(item.cardId, item)
  }

  return [...byId.values()].sort((a, b) => a.title.localeCompare(b.title))
}
