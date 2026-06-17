import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTab, createTabCard } from './createTab'
import { loadTabCards, loadTabs, saveTabCards, saveTabs } from './tabStorage'

describe('tabStorage — tabs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadTabs()).toEqual([])
  })

  it('persists and reloads a tab created with createTab', () => {
    const tab = createTab({ name: 'Work' })
    saveTabs([tab])
    expect(loadTabs()).toEqual([tab])
  })

  it('returns an empty array when stored data is invalid JSON', () => {
    localStorage.setItem('olive12:tabs', 'not-json')
    expect(loadTabs()).toEqual([])
  })

  it('returns an empty array when stored data is not an array', () => {
    localStorage.setItem('olive12:tabs', JSON.stringify({ id: 'nope' }))
    expect(loadTabs()).toEqual([])
  })
})

describe('tabStorage — tab_cards', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadTabCards()).toEqual([])
  })

  it('persists and reloads a tab_card created with createTabCard', () => {
    const tc = createTabCard({ tabId: 'tab-1', cardId: 'card-1', position: 0 })
    saveTabCards([tc])
    expect(loadTabCards()).toEqual([tc])
  })

  it('round-trips fold and hidden state', () => {
    const tc = { tabId: 'tab-1', cardId: 'card-1', position: 0, foldState: true, hiddenState: true }
    saveTabCards([tc])
    expect(loadTabCards()).toEqual([tc])
  })

  it('returns an empty array when stored data is invalid JSON', () => {
    localStorage.setItem('olive12:tab_cards', 'not-json')
    expect(loadTabCards()).toEqual([])
  })

  it('returns an empty array when stored data is not an array', () => {
    localStorage.setItem('olive12:tab_cards', JSON.stringify({ id: 'nope' }))
    expect(loadTabCards()).toEqual([])
  })
})
