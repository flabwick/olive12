import { db } from '../db/vaultDb'
import { extractLinks } from './linkLogic'

export async function getLinksForSource(cardId) {
  return db.links.where('sourceCardId').equals(cardId).toArray()
}

export async function getLinksForTarget(cardId) {
  return db.links.where('targetCardId').equals(cardId).toArray()
}

export async function putLinks(links) {
  await db.links.bulkPut(links)
}

export async function deleteLinksForSource(cardId) {
  await db.links.where('sourceCardId').equals(cardId).delete()
}

export async function getAllLinks() {
  return db.links.toArray()
}

export async function rebuildLinksForCard(card) {
  await deleteLinksForSource(card.id)
  const newLinks = extractLinks(card)
  if (newLinks.length > 0) {
    await putLinks(newLinks)
  }
}
