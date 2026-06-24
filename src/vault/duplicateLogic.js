const norm = (s) => (s ?? '').trim().toLowerCase()

export function findDuplicateFolder(folders, name, parentId, excludeId = null) {
  return folders.find(
    (f) => f.id !== excludeId && f.parentId === (parentId ?? null) && norm(f.name) === norm(name),
  ) ?? null
}

export function findDuplicateCard(cards, title, folderId, excludeId = null) {
  return cards.find(
    (c) => c.id !== excludeId && (c.folderId ?? null) === (folderId ?? null) && norm(c.title) === norm(title),
  ) ?? null
}
