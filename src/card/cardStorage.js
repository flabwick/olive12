import { db } from '../db/vaultDb'

export async function getAllCards() {
  return db.cards.toArray()
}

export async function putCard(card) {
  await db.cards.put({ ...card, dirty: true })
}

export async function deleteCard(cardId) {
  await db.cards.delete(cardId)
}

export async function getDirtyCards() {
  const all = await db.cards.toArray()
  return all.filter((c) => c.dirty)
}

export async function markCardClean(cardId, mergedCard) {
  await db.cards.put({ ...mergedCard, id: cardId, dirty: false })
}
