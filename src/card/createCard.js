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
