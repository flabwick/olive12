export function createCard({ title = '', body = '' } = {}) {
  return {
    id: crypto.randomUUID(),
    type: 'text',
    title,
    body,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateCardFields(card, { title = card.title, body = card.body } = {}) {
  return { ...card, title, body, updatedAt: Date.now() }
}
