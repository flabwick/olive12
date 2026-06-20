export function canFlip(card) {
  if (!card) return false
  if (card.type !== 'text') return false
  return typeof card.back === 'string' && card.back.trim().length > 0
}
