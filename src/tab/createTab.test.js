import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createTab,
  createTabCard,
  nextPosition,
  removeTabCard,
  reorderTabCard,
  setTabCardFold,
  setTabCardHidden,
} from './createTab'

describe('createTab', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a tab with default values', () => {
    expect(createTab()).toEqual({
      id: 'test-tab-uuid',
      name: 'New tab',
      kind: 'blank',
      order: 0,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('creates a tab with provided name and order', () => {
    expect(createTab({ name: 'Work', order: 2 })).toEqual({
      id: 'test-tab-uuid',
      name: 'Work',
      kind: 'blank',
      order: 2,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('assigns unique ids to each tab', () => {
    vi.restoreAllMocks()
    const a = createTab()
    const b = createTab()
    expect(a.id).not.toBe(b.id)
  })
})

describe('createTabCard', () => {
  it('creates a tab_card with false fold and hidden states', () => {
    expect(createTabCard({ tabId: 'tab-1', cardId: 'card-1', position: 0 })).toEqual({
      tabId: 'tab-1',
      cardId: 'card-1',
      position: 0,
      foldState: false,
      hiddenState: false,
    })
  })
})

describe('nextPosition', () => {
  it('returns 0 for an empty list', () => {
    expect(nextPosition([])).toBe(0)
  })

  it('returns the length of the list', () => {
    const tabCards = [
      { tabId: 't', cardId: 'a', position: 0, foldState: false, hiddenState: false },
      { tabId: 't', cardId: 'b', position: 1, foldState: false, hiddenState: false },
    ]
    expect(nextPosition(tabCards)).toBe(2)
  })
})

describe('reorderTabCard', () => {
  const base = [
    { tabId: 't', cardId: 'a', position: 0, foldState: false, hiddenState: false },
    { tabId: 't', cardId: 'b', position: 1, foldState: false, hiddenState: false },
    { tabId: 't', cardId: 'c', position: 2, foldState: false, hiddenState: false },
  ]

  it('moves a card to a later position', () => {
    const result = reorderTabCard(base, 'a', 2)
    expect(result.map((tc) => tc.cardId)).toEqual(['b', 'c', 'a'])
    expect(result.map((tc) => tc.position)).toEqual([0, 1, 2])
  })

  it('moves a card to an earlier position', () => {
    const result = reorderTabCard(base, 'c', 0)
    expect(result.map((tc) => tc.cardId)).toEqual(['c', 'a', 'b'])
    expect(result.map((tc) => tc.position)).toEqual([0, 1, 2])
  })

  it('returns the same array when card is already at that position', () => {
    const result = reorderTabCard(base, 'b', 1)
    expect(result).toBe(base)
  })

  it('returns the same array when cardId is not found', () => {
    const result = reorderTabCard(base, 'z', 0)
    expect(result).toBe(base)
  })

  it('clamps to the last valid position', () => {
    const result = reorderTabCard(base, 'a', 99)
    expect(result.map((tc) => tc.cardId)).toEqual(['b', 'c', 'a'])
  })
})

describe('setTabCardFold', () => {
  const base = [
    { tabId: 't', cardId: 'a', position: 0, foldState: false, hiddenState: false },
    { tabId: 't', cardId: 'b', position: 1, foldState: false, hiddenState: false },
  ]

  it('sets foldState to true for the matching card', () => {
    const result = setTabCardFold(base, 'a', true)
    expect(result[0].foldState).toBe(true)
    expect(result[1].foldState).toBe(false)
  })

  it('sets foldState to false (unfold)', () => {
    const folded = base.map((tc) => ({ ...tc, foldState: true }))
    const result = setTabCardFold(folded, 'a', false)
    expect(result[0].foldState).toBe(false)
  })

  it('does not mutate the input array', () => {
    setTabCardFold(base, 'a', true)
    expect(base[0].foldState).toBe(false)
  })
})

describe('setTabCardHidden', () => {
  const base = [
    { tabId: 't', cardId: 'a', position: 0, foldState: false, hiddenState: false },
    { tabId: 't', cardId: 'b', position: 1, foldState: false, hiddenState: false },
  ]

  it('sets hiddenState to true for the matching card', () => {
    const result = setTabCardHidden(base, 'a', true)
    expect(result[0].hiddenState).toBe(true)
    expect(result[1].hiddenState).toBe(false)
  })

  it('sets hiddenState to false (unhide)', () => {
    const hidden = base.map((tc) => ({ ...tc, hiddenState: true }))
    const result = setTabCardHidden(hidden, 'a', false)
    expect(result[0].hiddenState).toBe(false)
  })

  it('does not mutate the input array', () => {
    setTabCardHidden(base, 'a', true)
    expect(base[0].hiddenState).toBe(false)
  })
})

describe('removeTabCard', () => {
  const base = [
    { tabId: 't', cardId: 'a', position: 0, foldState: false, hiddenState: false },
    { tabId: 't', cardId: 'b', position: 1, foldState: false, hiddenState: false },
    { tabId: 't', cardId: 'c', position: 2, foldState: false, hiddenState: false },
  ]

  it('removes the matching tab_card', () => {
    const result = removeTabCard(base, 'b')
    expect(result.map((tc) => tc.cardId)).toEqual(['a', 'c'])
  })

  it('renumbers positions after removal', () => {
    const result = removeTabCard(base, 'a')
    expect(result.map((tc) => tc.position)).toEqual([0, 1])
  })

  it('returns the same array when cardId is not found', () => {
    const result = removeTabCard(base, 'z')
    expect(result).toEqual(base)
  })

  it('returns an empty array when the only card is removed', () => {
    const single = [{ tabId: 't', cardId: 'a', position: 0, foldState: false, hiddenState: false }]
    expect(removeTabCard(single, 'a')).toEqual([])
  })

  it('does not mutate the input array', () => {
    removeTabCard(base, 'b')
    expect(base).toHaveLength(3)
  })
})
