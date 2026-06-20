export function createCard({ title = '', body = '', back = '', type = 'text', config = null } = {}) {
  return {
    id: crypto.randomUUID(),
    type,
    title,
    body,
    back,
    config,
    location: 'none',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateCardFields(card, { title = card.title, body = card.body, back = card.back ?? '', location = card.location, folderId = card.folderId, config = card.config } = {}) {
  return { ...card, title, body, back, location, folderId, config, updatedAt: Date.now() }
}
