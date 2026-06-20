import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  closeSavedTab,
  createTab,
  createTabCard,
  isTabOpen,
  moveTabToLibrary,
  nextPosition,
  removeTab,
  removeTabCard,
  reopenTab,
  reorderTabCard,
  reorderTabs,
  saveTabToShelf,
  setTabCardFold,
  setTabCardHidden,
  setTabName,
  updateTabFields,
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
      name: '',
      kind: 'blank',
      order: 0,
      savedLocation: 'none',
      savedFolderId: null,
      isOpen: true,
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
      savedLocation: 'none',
      savedFolderId: null,
      isOpen: true,
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

describe('updateTabFields', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_001_000)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('merges fields and refreshes updatedAt', () => {
    const tab = { id: 'a', name: 'Old', updatedAt: 1_000 }
    const result = updateTabFields(tab, { name: 'New' })
    expect(result.name).toBe('New')
    expect(result.updatedAt).toBe(1_700_000_001_000)
    expect(result.id).toBe('a')
  })

  it('does not mutate the input tab', () => {
    const tab = { id: 'a', name: 'Old', updatedAt: 1_000 }
    updateTabFields(tab, { name: 'New' })
    expect(tab.name).toBe('Old')
  })
})

describe('setTabName', () => {
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(1_700_000_002_000) })
  afterEach(() => { vi.restoreAllMocks() })

  const base = [
    { id: 'tab-a', name: 'Alpha', order: 0, updatedAt: 1_000 },
    { id: 'tab-b', name: 'Beta', order: 1, updatedAt: 1_000 },
  ]

  it('updates name and updatedAt of matching tab', () => {
    const result = setTabName(base, 'tab-a', 'Renamed')
    expect(result[0].name).toBe('Renamed')
    expect(result[0].updatedAt).toBe(1_700_000_002_000)
  })

  it('leaves other tabs unchanged', () => {
    const result = setTabName(base, 'tab-a', 'Renamed')
    expect(result[1].name).toBe('Beta')
  })

  it('does not mutate the original array', () => {
    setTabName(base, 'tab-a', 'Renamed')
    expect(base[0].name).toBe('Alpha')
  })
})

describe('removeTab', () => {
  const base = [
    { id: 'tab-a', name: 'A', order: 0 },
    { id: 'tab-b', name: 'B', order: 1 },
    { id: 'tab-c', name: 'C', order: 2 },
  ]

  it('removes the matching tab', () => {
    const result = removeTab(base, 'tab-b')
    expect(result.map((t) => t.id)).toEqual(['tab-a', 'tab-c'])
  })

  it('renumbers order fields after removal', () => {
    const result = removeTab(base, 'tab-a')
    expect(result.map((t) => t.order)).toEqual([0, 1])
  })

  it('does not mutate original array', () => {
    removeTab(base, 'tab-a')
    expect(base).toHaveLength(3)
  })
})

describe('reorderTabs', () => {
  const base = [
    { id: 'tab-a', name: 'A', order: 0 },
    { id: 'tab-b', name: 'B', order: 1 },
    { id: 'tab-c', name: 'C', order: 2 },
  ]

  it('moves a tab to a later position', () => {
    const result = reorderTabs(base, 'tab-a', 2)
    expect(result.map((t) => t.id)).toEqual(['tab-b', 'tab-c', 'tab-a'])
    expect(result.map((t) => t.order)).toEqual([0, 1, 2])
  })

  it('moves a tab to an earlier position', () => {
    const result = reorderTabs(base, 'tab-c', 0)
    expect(result.map((t) => t.id)).toEqual(['tab-c', 'tab-a', 'tab-b'])
  })

  it('returns same array when tab is already at position', () => {
    const result = reorderTabs(base, 'tab-b', 1)
    expect(result).toBe(base)
  })
})

describe('saveTabToShelf', () => {
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(1_700_000_003_000) })
  afterEach(() => { vi.restoreAllMocks() })

  it('sets savedLocation to shelf', () => {
    const tab = { id: 't', savedLocation: 'none', savedFolderId: null, updatedAt: 1_000 }
    const result = saveTabToShelf(tab)
    expect(result.savedLocation).toBe('shelf')
    expect(result.updatedAt).toBe(1_700_000_003_000)
  })

  it('does not mutate the input tab', () => {
    const tab = { id: 't', savedLocation: 'none', updatedAt: 1_000 }
    saveTabToShelf(tab)
    expect(tab.savedLocation).toBe('none')
  })
})

describe('moveTabToLibrary', () => {
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(1_700_000_004_000) })
  afterEach(() => { vi.restoreAllMocks() })

  it('sets savedLocation to library', () => {
    const tab = { id: 't', savedLocation: 'shelf', savedFolderId: null, updatedAt: 1_000 }
    const result = moveTabToLibrary(tab)
    expect(result.savedLocation).toBe('library')
    expect(result.updatedAt).toBe(1_700_000_004_000)
  })

  it('sets savedFolderId when provided', () => {
    const tab = { id: 't', savedLocation: 'shelf', savedFolderId: null, updatedAt: 1_000 }
    const result = moveTabToLibrary(tab, 'folder-1')
    expect(result.savedFolderId).toBe('folder-1')
  })

  it('defaults savedFolderId to null', () => {
    const tab = { id: 't', savedLocation: 'shelf', savedFolderId: 'old', updatedAt: 1_000 }
    const result = moveTabToLibrary(tab)
    expect(result.savedFolderId).toBeNull()
  })
})

describe('isTabOpen', () => {
  it('treats missing isOpen as open', () => {
    expect(isTabOpen({ id: 't' })).toBe(true)
  })

  it('returns false when isOpen is false', () => {
    expect(isTabOpen({ id: 't', isOpen: false })).toBe(false)
  })
})

describe('closeSavedTab and reopenTab', () => {
  beforeEach(() => { vi.spyOn(Date, 'now').mockReturnValue(1_700_000_005_000) })
  afterEach(() => { vi.restoreAllMocks() })

  it('closeSavedTab sets isOpen to false', () => {
    const tab = { id: 't', isOpen: true, updatedAt: 1_000 }
    expect(closeSavedTab(tab)).toMatchObject({ isOpen: false, updatedAt: 1_700_000_005_000 })
  })

  it('reopenTab sets isOpen to true', () => {
    const tab = { id: 't', isOpen: false, updatedAt: 1_000 }
    expect(reopenTab(tab)).toMatchObject({ isOpen: true, updatedAt: 1_700_000_005_000 })
  })
})
