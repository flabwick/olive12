function fnv1a(str) {
  let hash = 2166136261
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = Math.imul(hash, 16777619) >>> 0
  }
  return hash.toString(16)
}

export function computeContentHash(card) {
  const input = JSON.stringify({ body: card.body ?? '', config: card.config ?? {} })
  return fnv1a(input)
}

export function classifyCardSync(localCard, remoteCard) {
  if (!remoteCard) return 'LOCAL_ONLY'
  if (!localCard) return 'REMOTE_ONLY'

  const localTs = localCard.updatedAt
  const remoteTs = new Date(remoteCard.updated_at).getTime()

  if (localTs === remoteTs && localCard.content_hash === remoteCard.content_hash) {
    return 'IN_SYNC'
  }
  if (localTs >= remoteTs) return 'LOCAL_NEWER'
  return 'REMOTE_NEWER'
}

export function resolveCardConflict(localCard, remoteCard) {
  const classification = classifyCardSync(localCard, remoteCard)
  switch (classification) {
    case 'LOCAL_ONLY':
      return { action: 'PUSH_LOCAL', winner: 'local' }
    case 'REMOTE_ONLY':
      return { action: 'PULL_REMOTE', winner: 'remote' }
    case 'IN_SYNC':
      return { action: 'NOOP', winner: null }
    case 'LOCAL_NEWER':
      return { action: 'PUSH_LOCAL', winner: 'local' }
    case 'REMOTE_NEWER':
      // TODO: Show conflict UI in a later slice — for now default to pulling remote
      return { action: 'PULL_REMOTE', winner: 'remote' }
    default:
      return { action: 'NOOP', winner: null }
  }
}
