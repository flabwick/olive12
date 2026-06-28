import { describe, expect, it } from 'vitest'
import {
  addMember,
  canDissolve,
  flattenIds,
  flattenMembers,
  isStackCard,
  removeMember,
  reorderMembers,
  resolveMembers,
  resolveTopCard,
  setTopCard,
} from './stackLogic'

function makeStack(memberIds = [], topCardId = null, overrides = {}) {
  return {
    id: 'stack-1',
    type: 'stack',
    title: '',
    body: '',
    back: '',
    location: 'none',
    folderId: null,
    config: { memberIds, topCardId: topCardId ?? (memberIds[0] ?? null) },
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

describe('isStackCard', () => {
  it('returns true for a stack card', () => {
    expect(isStackCard({ type: 'stack' })).toBe(true)
  })

  it('returns false for a text card', () => {
    expect(isStackCard({ type: 'text' })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isStackCard(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isStackCard(undefined)).toBe(false)
  })
})

describe('addMember', () => {
  it('appends cardId to memberIds', () => {
    const stack = makeStack(['a', 'b'], 'a')
    const result = addMember(stack, 'c')
    expect(result.config.memberIds).toEqual(['a', 'b', 'c'])
  })

  it('does not mutate input', () => {
    const stack = makeStack(['a', 'b'], 'a')
    addMember(stack, 'c')
    expect(stack.config.memberIds).toEqual(['a', 'b'])
  })

  it('sets topCardId when it was null', () => {
    const stack = makeStack([], null, { config: { memberIds: [], topCardId: null } })
    const result = addMember(stack, 'x')
    expect(result.config.topCardId).toBe('x')
  })

  it('does not change topCardId when it was already set', () => {
    const stack = makeStack(['a', 'b'], 'a')
    const result = addMember(stack, 'c')
    expect(result.config.topCardId).toBe('a')
  })

  it('does not deduplicate: adding the same ID twice results in it appearing twice', () => {
    const stack = makeStack(['a', 'b'], 'a')
    const result = addMember(addMember(stack, 'a'), 'a')
    expect(result.config.memberIds).toEqual(['a', 'b', 'a', 'a'])
  })
})

describe('removeMember', () => {
  it('removes the correct member', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    const result = removeMember(stack, 'b')
    expect(result.config.memberIds).toEqual(['a', 'c'])
  })

  it('does not mutate input', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    removeMember(stack, 'b')
    expect(stack.config.memberIds).toEqual(['a', 'b', 'c'])
  })

  it('returns null when result would have 1 member', () => {
    const stack = makeStack(['a', 'b'], 'a')
    expect(removeMember(stack, 'a')).toBeNull()
  })

  it('returns null when result would have 0 members', () => {
    const stack = makeStack(['a', 'b'], 'a')
    // Remove both — after first removal we get null, but test a degenerate case
    // by directly creating a 1-member stack
    const oneStack = { ...stack, config: { memberIds: ['a'], topCardId: 'a' } }
    expect(removeMember(oneStack, 'a')).toBeNull()
  })

  it('advances topCardId to next member when topCard is removed (middle)', () => {
    const stack = makeStack(['a', 'b', 'c'], 'b')
    const result = removeMember(stack, 'b')
    expect(result.config.topCardId).toBe('c')
  })

  it('wraps topCardId to first member when last member is removed', () => {
    const stack = makeStack(['a', 'b', 'c'], 'c')
    const result = removeMember(stack, 'c')
    expect(result.config.memberIds).toEqual(['a', 'b'])
    expect(result.config.topCardId).toBe('a')
  })

  it('keeps topCardId unchanged when a non-top member is removed', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    const result = removeMember(stack, 'c')
    expect(result.config.topCardId).toBe('a')
  })
})

describe('reorderMembers', () => {
  it('moves member from beginning to end', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    const result = reorderMembers(stack, 0, 2)
    expect(result.config.memberIds).toEqual(['b', 'c', 'a'])
  })

  it('moves member from end to beginning', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    const result = reorderMembers(stack, 2, 0)
    expect(result.config.memberIds).toEqual(['c', 'a', 'b'])
  })

  it('moves member from middle to different position', () => {
    const stack = makeStack(['a', 'b', 'c', 'd'], 'a')
    const result = reorderMembers(stack, 1, 3)
    expect(result.config.memberIds).toEqual(['a', 'c', 'd', 'b'])
  })

  it('does not mutate input', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    reorderMembers(stack, 0, 2)
    expect(stack.config.memberIds).toEqual(['a', 'b', 'c'])
  })

  it('returns same reference when fromIndex === toIndex', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    const result = reorderMembers(stack, 1, 1)
    expect(result).toBe(stack)
  })

  it('does not change topCardId', () => {
    const stack = makeStack(['a', 'b', 'c'], 'b')
    const result = reorderMembers(stack, 0, 2)
    expect(result.config.topCardId).toBe('b')
  })
})

describe('setTopCard', () => {
  it('sets topCardId to a valid member', () => {
    const stack = makeStack(['a', 'b', 'c'], 'a')
    const result = setTopCard(stack, 'c')
    expect(result.config.topCardId).toBe('c')
  })

  it('throws when cardId is not in memberIds', () => {
    const stack = makeStack(['a', 'b'], 'a')
    expect(() => setTopCard(stack, 'z')).toThrow()
  })

  it('does not mutate input', () => {
    const stack = makeStack(['a', 'b'], 'a')
    setTopCard(stack, 'b')
    expect(stack.config.topCardId).toBe('a')
  })
})

describe('resolveTopCard', () => {
  const cardA = { id: 'a', type: 'text' }
  const cardB = { id: 'b', type: 'text' }
  const cardsById = { a: cardA, b: cardB }

  it('returns correct card when topCardId is set', () => {
    const stack = makeStack(['a', 'b'], 'b')
    expect(resolveTopCard(stack, cardsById)).toBe(cardB)
  })

  it('falls back to memberIds[0] when topCardId is null', () => {
    const stack = { ...makeStack(['a', 'b']), config: { memberIds: ['a', 'b'], topCardId: null } }
    expect(resolveTopCard(stack, cardsById)).toBe(cardA)
  })

  it('returns null when topCardId is set but not in cardsById', () => {
    const stack = makeStack(['x', 'y'], 'x')
    expect(resolveTopCard(stack, cardsById)).toBeNull()
  })

  it('returns null when memberIds is empty and topCardId is null', () => {
    const stack = { ...makeStack(), config: { memberIds: [], topCardId: null } }
    expect(resolveTopCard(stack, cardsById)).toBeNull()
  })
})

describe('resolveMembers', () => {
  const cardA = { id: 'a', type: 'text' }
  const cardB = { id: 'b', type: 'text' }
  const cardsById = { a: cardA, b: cardB }

  it('returns ordered array matching memberIds length', () => {
    const stack = makeStack(['a', 'b'], 'a')
    const result = resolveMembers(stack, cardsById)
    expect(result).toHaveLength(2)
  })

  it('returns null at positions where card is not in cardsById', () => {
    const stack = makeStack(['a', 'missing', 'b'], 'a')
    const result = resolveMembers(stack, cardsById)
    expect(result).toEqual([cardA, null, cardB])
  })

  it('returns all cards when all present', () => {
    const stack = makeStack(['a', 'b'], 'a')
    expect(resolveMembers(stack, cardsById)).toEqual([cardA, cardB])
  })

  it('returns empty array for empty memberIds', () => {
    const stack = { ...makeStack(), config: { memberIds: [], topCardId: null } }
    expect(resolveMembers(stack, cardsById)).toEqual([])
  })
})

describe('canDissolve', () => {
  it('returns true for 0 members', () => {
    const stack = { ...makeStack(), config: { memberIds: [], topCardId: null } }
    expect(canDissolve(stack)).toBe(true)
  })

  it('returns true for 1 member', () => {
    const stack = { ...makeStack(), config: { memberIds: ['a'], topCardId: 'a' } }
    expect(canDissolve(stack)).toBe(true)
  })

  it('returns false for 2 members', () => {
    expect(canDissolve(makeStack(['a', 'b'], 'a'))).toBe(false)
  })

  it('returns false for 3+ members', () => {
    expect(canDissolve(makeStack(['a', 'b', 'c'], 'a'))).toBe(false)
  })
})

describe('flattenMembers', () => {
  it('flat stack returns its own memberIds', () => {
    const cardA = { id: 'a', type: 'text' }
    const cardB = { id: 'b', type: 'text' }
    const stack = makeStack(['a', 'b'], 'a')
    const cardsById = { a: cardA, b: cardB }
    expect(flattenMembers(stack, cardsById)).toEqual(['a', 'b'])
  })

  it('nested stack: inner members are inlined at correct position', () => {
    const cardA = { id: 'a', type: 'text' }
    const cardC = { id: 'c', type: 'text' }
    const inner = { id: 'inner', type: 'stack', config: { memberIds: ['a', 'c'], topCardId: 'a' } }
    const cardB = { id: 'b', type: 'text' }
    const outer = { ...makeStack(['inner', 'b'], 'inner'), id: 'outer' }
    const cardsById = { inner, a: cardA, b: cardB, c: cardC }
    expect(flattenMembers(outer, cardsById)).toEqual(['a', 'c', 'b'])
  })

  it('deeply nested (3 levels) resolves correctly', () => {
    const cardX = { id: 'x', type: 'text' }
    const cardY = { id: 'y', type: 'text' }
    const cardZ = { id: 'z', type: 'text' }
    const deepInner = { id: 'deep', type: 'stack', config: { memberIds: ['x', 'y'], topCardId: 'x' } }
    const mid = { id: 'mid', type: 'stack', config: { memberIds: ['deep', 'z'], topCardId: 'deep' } }
    const outer = { ...makeStack(['mid'], null), id: 'outer', config: { memberIds: ['mid'], topCardId: 'mid' } }
    const cardsById = { deep: deepInner, mid, x: cardX, y: cardY, z: cardZ }
    expect(flattenMembers(outer, cardsById)).toEqual(['x', 'y', 'z'])
  })

  it('missing cards in cardsById pass through as IDs unchanged', () => {
    const cardA = { id: 'a', type: 'text' }
    const stack = makeStack(['a', 'missing-id', 'b'], 'a')
    const cardB = { id: 'b', type: 'text' }
    const cardsById = { a: cardA, b: cardB }
    expect(flattenMembers(stack, cardsById)).toEqual(['a', 'missing-id', 'b'])
  })

  it('portal cards are treated as leaves', () => {
    const portal = { id: 'p', type: 'portal', config: { target_card_id: 'somewhere' } }
    const cardA = { id: 'a', type: 'text' }
    const stack = makeStack(['a', 'p'], 'a')
    const cardsById = { a: cardA, p: portal }
    expect(flattenMembers(stack, cardsById)).toEqual(['a', 'p'])
  })

  it('cycle detection: stack A contains stack B which contains stack A, does not recurse infinitely', () => {
    const stackB = { id: 'b', type: 'stack', config: { memberIds: ['a', 'c'], topCardId: 'a' } }
    const stackA = { id: 'a', type: 'stack', config: { memberIds: ['b', 'd'], topCardId: 'b' } }
    const cardC = { id: 'c', type: 'text' }
    const cardD = { id: 'd', type: 'text' }
    const cardsById = { a: stackA, b: stackB, c: cardC, d: cardD }
    // Stack A → Stack B → (Stack A [cycle, skip], card C), card D
    // Result: ['c', 'd']
    expect(flattenMembers(stackA, cardsById)).toEqual(['c', 'd'])
  })
})

describe('flattenIds', () => {
  it('passes through regular card IDs unchanged', () => {
    const cardsById = {
      a: { id: 'a', type: 'text' },
      b: { id: 'b', type: 'text' },
    }
    expect(flattenIds(['a', 'b'], cardsById)).toEqual(['a', 'b'])
  })

  it('expands a stack ID to its member IDs', () => {
    const cardsById = {
      'stack-1': makeStack(['a', 'b'], 'a', { id: 'stack-1' }),
      a: { id: 'a', type: 'text' },
      b: { id: 'b', type: 'text' },
    }
    expect(flattenIds(['stack-1', 'c'], cardsById)).toEqual(['a', 'b', 'c'])
  })

  it('handles mixed cards and stacks', () => {
    const cardsById = {
      'stack-1': makeStack(['b', 'c'], 'b', { id: 'stack-1' }),
      a: { id: 'a', type: 'text' },
      b: { id: 'b', type: 'text' },
      c: { id: 'c', type: 'text' },
    }
    expect(flattenIds(['a', 'stack-1'], cardsById)).toEqual(['a', 'b', 'c'])
  })

  it('returns unknown IDs as-is', () => {
    expect(flattenIds(['unknown'], {})).toEqual(['unknown'])
  })
})
