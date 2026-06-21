export function canFlip(card) {
  if (!card) return false
  if (card.type !== 'text') return false
  return typeof card.back === 'string' && card.back.trim().length > 0
}

export function toggleFlip(flippedSet, cardId) {
  const next = new Set(flippedSet)
  if (next.has(cardId)) {
    next.delete(cardId)
  } else {
    next.add(cardId)
  }
  return next
}

export function isFlipped(flippedSet, cardId) {
  return flippedSet.has(cardId)
}
