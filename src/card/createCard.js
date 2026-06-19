export function createCard({ title = '', body = '', type = 'text', config = null } = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    body,
    config,
    location: 'none',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateCardFields(card, { title = card.title, body = card.body, location = card.location, folderId = card.folderId, config = card.config } = {}) {
  return { ...card, title, body, location, folderId, config, updatedAt: Date.now() }
}
