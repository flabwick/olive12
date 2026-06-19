export function extractLinks(card) {
  const links = []
  const now = Date.now()

  if (card.type === 'portal' && card.config?.target_card_id) {
    links.push({
      sourceCardId: card.id,
      targetCardId: card.config.target_card_id,
      linkType: 'portal',
      createdAt: now,
    })
  }

  if (card.type === 'text' && card.body) {
    const embedPattern = /\[\[([^\]]+)\]\]/g
    let match
    while ((match = embedPattern.exec(card.body)) !== null) {
      links.push({
        sourceCardId: card.id,
        targetCardId: match[1],
        linkType: 'embed',
        createdAt: now,
      })
    }
  }

  return links
}

export function diffLinks(existingLinks, newLinks) {
  const existingTargets = new Set(existingLinks.map((l) => l.targetCardId))
  const newTargets = new Set(newLinks.map((l) => l.targetCardId))
  return {
    toAdd: newLinks.filter((l) => !existingTargets.has(l.targetCardId)),
    toRemove: existingLinks.filter((l) => !newTargets.has(l.targetCardId)),
  }
}

export function isOrphan(cardId, allLinks) {
  return !allLinks.some(
    (l) => l.sourceCardId === cardId || l.targetCardId === cardId,
  )
}
