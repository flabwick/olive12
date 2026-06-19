import { db } from '../db/vaultDb'

export async function getAllTabs() {
  return db.tabs.toArray()
}

export async function putTab(tab) {
  await db.tabs.put(tab)
}

export async function getAllTabCards() {
  return db.tab_cards.toArray()
}

export async function putTabCard(tabCard) {
  await db.tab_cards.put(tabCard)
}

export async function deleteTabCard(tabId, cardId) {
  await db.tab_cards.delete([tabId, cardId])
}

export async function deleteTab(tabId) {
  await db.tabs.delete(tabId)
}

export async function deleteAllTabCards(tabId) {
  await db.tab_cards.where('tabId').equals(tabId).delete()
}
