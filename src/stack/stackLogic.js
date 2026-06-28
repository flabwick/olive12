export function isStackCard(card) {
  return card?.type === 'stack'
}

export function addMember(stack, cardId) {
  const newMemberIds = [...stack.config.memberIds, cardId]
  const newTopCardId = stack.config.topCardId === null ? cardId : stack.config.topCardId
  return {
    ...stack,
    config: {
      ...stack.config,
      memberIds: newMemberIds,
      topCardId: newTopCardId,
    },
  }
}

export function removeMember(stack, cardId) {
  const oldIds = stack.config.memberIds
  const newIds = oldIds.filter((id) => id !== cardId)

  if (newIds.length < 2) return null

  let newTopCardId = stack.config.topCardId
  if (newTopCardId === cardId) {
    const removedIndex = oldIds.indexOf(cardId)
    newTopCardId = newIds[removedIndex] ?? newIds[0]
  }

  return {
    ...stack,
    config: {
      ...stack.config,
      memberIds: newIds,
      topCardId: newTopCardId,
    },
  }
}

export function reorderMembers(stack, fromIndex, toIndex) {
  if (fromIndex === toIndex) return stack

  const ids = [...stack.config.memberIds]
  const [moved] = ids.splice(fromIndex, 1)
  ids.splice(toIndex, 0, moved)

  return {
    ...stack,
    config: {
      ...stack.config,
      memberIds: ids,
    },
  }
}

export function setTopCard(stack, cardId) {
  if (!stack.config.memberIds.includes(cardId)) {
    throw new Error(`setTopCard: cardId "${cardId}" is not present in memberIds`)
  }
  return {
    ...stack,
    config: {
      ...stack.config,
      topCardId: cardId,
    },
  }
}

export function resolveTopCard(stack, cardsById) {
  if (stack.config.topCardId !== null) {
    return cardsById[stack.config.topCardId] ?? null
  }
  const firstId = stack.config.memberIds[0]
  if (!firstId) return null
  return cardsById[firstId] ?? null
}

export function resolveMembers(stack, cardsById) {
  return stack.config.memberIds.map((id) => cardsById[id] ?? null)
}

export function canDissolve(stack) {
  return stack.config.memberIds.length <= 1
}

export function flattenIds(ids, cardsById) {
  const result = []
  for (const id of ids) {
    const card = cardsById[id]
    if (card && card.type === 'stack') {
      result.push(...flattenMembers(card, cardsById))
    } else {
      result.push(id)
    }
  }
  return result
}

export function flattenMembers(stack, cardsById) {
  function flatten(stackCard, ancestors) {
    const result = []
    for (const id of stackCard.config.memberIds) {
      const card = cardsById[id]
      if (card && card.type === 'stack') {
        if (ancestors.has(id)) {
          // cycle — skip to avoid infinite recursion
        } else {
          const newAncestors = new Set([...ancestors, id])
          result.push(...flatten(card, newAncestors))
        }
      } else {
        result.push(id)
      }
    }
    return result
  }
  return flatten(stack, new Set([stack.id]))
}
