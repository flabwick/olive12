export function createStack({ title = '', memberIds = [], topCardId = null } = {}) {
  if (memberIds.length === 1) {
    throw new Error('createStack: memberIds must have at least 2 entries or be empty (got 1)')
  }

  if (topCardId !== null && !memberIds.includes(topCardId)) {
    throw new Error(`createStack: topCardId "${topCardId}" is not present in memberIds`)
  }

  const resolvedTopCardId = topCardId !== null
    ? topCardId
    : memberIds.length > 0
      ? memberIds[0]
      : null

  return {
    id: crypto.randomUUID(),
    type: 'stack',
    title,
    body: '',
    back: '',
    config: {
      memberIds: [...memberIds],
      topCardId: resolvedTopCardId,
    },
    location: 'none',
    folderId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateStackFields(stack, { title = stack.title, back = stack.back ?? '', location = stack.location, folderId = stack.folderId, config } = {}) {
  const mergedConfig = config !== undefined
    ? { ...stack.config, ...config }
    : stack.config

  return {
    ...stack,
    title,
    back,
    location,
    folderId,
    config: mergedConfig,
    updatedAt: Date.now(),
  }
}
