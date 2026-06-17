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
