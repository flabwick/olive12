export function createCard({ title = '', body = '' } = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    title,
    body,
    location: 'none',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateCardFields(card, { title = card.title, body = card.body, location = card.location, folderId = card.folderId } = {}) {
  return { ...card, title, body, location, folderId, updatedAt: Date.now() }
}
