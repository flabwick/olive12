import { db } from '../db/vaultDb'

export async function getAllDockCards() {
  return db.dock_cards.orderBy('order').toArray()
}

export async function addDockCard(cardId) {
  const existing = await db.dock_cards.get(cardId)
  if (existing) return
  const all = await db.dock_cards.toArray()
  const maxOrder = all.reduce((m, r) => Math.max(m, r.order), -1)
  await db.dock_cards.put({ cardId, order: maxOrder + 1 })
}

export async function removeDockCard(cardId) {
  await db.dock_cards.delete(cardId)
}

export async function getDockCardIds() {
  const records = await db.dock_cards.orderBy('order').toArray()
  return records.map((r) => r.cardId)
}
