export function createCard({ title = '', body = '' } = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    title,
    body,
    location: 'none',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateCardFields(card, { title = card.title, body = card.body, location = card.location } = {}) {
  return { ...card, title, body, location, updatedAt: Date.now() }
}
