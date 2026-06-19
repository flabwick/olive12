export function createIndexEntry({ cardId, title = '', tags = [], summary = '', links = [], contentHash = '' } = {}) {
  return {
    cardId,
    title,
    tags,
    summary,
    links,
    contentHash,
    updatedAt: Date.now(),
  }
}
