/** True when the card already appears on a tab (directly or via a portal). */
export function isCardOnTab(cardId, tabCards, cardsById) {
  for (const tc of tabCards) {
    if (tc.cardId === cardId) return true
    const tabCard = cardsById[tc.cardId]
    if (tabCard?.type === 'portal' && tabCard.config?.target_card_id === cardId) return true
  }
  return false
}

/**
 * Remote/local cards with no tab placement — only unsaved drafts (location 'none').
 * Vault cards and portal targets must not be auto-inserted into tabs on refresh.
 */
export function isOrphanTabCandidate(card, tabCards, cardsById) {
  if (!card || card.type === 'portal') return false
  if (card.location === 'shelf' || card.location === 'library') return false
  return !isCardOnTab(card.id, tabCards, cardsById)
}
