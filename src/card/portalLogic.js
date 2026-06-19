export function isPortalCard(card) {
  return card?.type === 'portal'
}

export function resolvePortalTarget(portalCard, cardsById) {
  const targetId = portalCard?.config?.target_card_id
  if (!targetId) return null
  return cardsById[targetId] ?? null
}
