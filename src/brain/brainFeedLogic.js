import { isOrphan } from '../card/linkLogic'

export function detectStaleEntries(cards, indexEntries, allLinks = []) {
  const indexById = new Map(indexEntries.map((e) => [e.cardId, e]))
  const flags = []

  for (const card of cards) {
    const entry = indexById.get(card.id)
    if (!entry) continue

    if (card.contentHash && entry.contentHash && card.contentHash !== entry.contentHash) {
      flags.push({ cardId: card.id, reason: 'stale' })
    } else if (isOrphan(card.id, allLinks)) {
      flags.push({ cardId: card.id, reason: 'orphan' })
    }
  }

  return flags
}
