export function createFolder({ name = 'New folder', parentId = null } = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    parentId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function buildFolderTree(folders, parentId = null) {
  return folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((f) => ({
      ...f,
      children: buildFolderTree(folders, f.id),
    }))
}

export function flattenFolderTree(folders, parentId = null, depth = 0) {
  const children = folders
    .filter((f) => f.parentId === parentId)
    .sort((a, b) => a.name.localeCompare(b.name))
  return children.flatMap((f) => [
    { folder: f, depth },
    ...flattenFolderTree(folders, f.id, depth + 1),
  ])
}
