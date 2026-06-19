import { db } from '../db/vaultDb'

export async function getAllIndexEntries() {
  return db.index_entries.toArray()
}

export async function getIndexEntry(cardId) {
  return db.index_entries.get(cardId)
}

export async function putIndexEntry(entry) {
  await db.index_entries.put(entry)
}

export async function deleteIndexEntry(cardId) {
  await db.index_entries.delete(cardId)
}

export async function searchIndexEntries(query) {
  const all = await getAllIndexEntries()
  const q = query.toLowerCase()
  return all
    .filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.tags.join(' ').toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q),
    )
    .sort((a, b) => b.updatedAt - a.updatedAt)
}
