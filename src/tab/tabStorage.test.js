import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { createTab, createTabCard } from './createTab'
import { deleteAllTabCards, deleteTab, deleteTabCard, getAllTabCards, getAllTabs, putTab, putTabCard } from './tabStorage'

describe('tabStorage — tabs', () => {
  beforeEach(async () => {
    await db.tabs.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty array when no tabs are stored', async () => {
    expect(await getAllTabs()).toEqual([])
  })

  it('putTab stores a tab and getAllTabs retrieves it', async () => {
    const tab = createTab({ name: 'Work' })
    await putTab(tab)
    const tabs = await getAllTabs()
    expect(tabs).toHaveLength(1)
    expect(tabs[0]).toMatchObject({ id: 'test-tab-uuid', name: 'Work' })
  })

  it('putTab updates an existing tab without creating a duplicate', async () => {
    const tab = createTab({ name: 'Old' })
    await putTab(tab)
    await putTab({ ...tab, name: 'New' })
    const tabs = await getAllTabs()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].name).toBe('New')
  })
})

describe('tabStorage — tab_cards', () => {
  beforeEach(async () => {
    await db.tab_cards.clear()
  })

  it('returns an empty array when no tab_cards are stored', async () => {
    expect(await getAllTabCards()).toEqual([])
  })

  it('putTabCard stores a tab_card and getAllTabCards retrieves it', async () => {
    const tc = createTabCard({ tabId: 'tab-1', cardId: 'card-1', position: 0 })
    await putTabCard(tc)
    const tcs = await getAllTabCards()
    expect(tcs).toHaveLength(1)
    expect(tcs[0]).toMatchObject({ tabId: 'tab-1', cardId: 'card-1', position: 0 })
  })

  it('round-trips foldState and hiddenState', async () => {
    const tc = { tabId: 'tab-1', cardId: 'card-1', position: 0, foldState: true, hiddenState: true }
    await putTabCard(tc)
    const tcs = await getAllTabCards()
    expect(tcs[0]).toMatchObject({ foldState: true, hiddenState: true })
  })

  it('putTabCard updates position without creating a duplicate', async () => {
    const tc = createTabCard({ tabId: 'tab-1', cardId: 'card-1', position: 0 })
    await putTabCard(tc)
    await putTabCard({ ...tc, position: 5 })
    const tcs = await getAllTabCards()
    expect(tcs).toHaveLength(1)
    expect(tcs[0].position).toBe(5)
  })

  it('deleteTabCard removes the entry by compound key', async () => {
    const tc = createTabCard({ tabId: 'tab-1', cardId: 'card-1', position: 0 })
    await putTabCard(tc)
    await deleteTabCard('tab-1', 'card-1')
    expect(await getAllTabCards()).toEqual([])
  })
})

describe('tabStorage — deleteTab', () => {
  beforeEach(async () => {
    await db.tabs.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('deleteTab removes the tab record', async () => {
    const tab = createTab({ name: 'To Delete' })
    await putTab(tab)
    await deleteTab(tab.id)
    expect(await getAllTabs()).toEqual([])
  })

  it('deleteTab is a no-op when tab does not exist', async () => {
    await expect(deleteTab('nonexistent')).resolves.toBeUndefined()
  })
})

describe('tabStorage — deleteAllTabCards', () => {
  beforeEach(async () => { await db.tab_cards.clear() })

  it('deletes all tab_cards for the given tabId', async () => {
    await putTabCard(createTabCard({ tabId: 'tab-a', cardId: 'card-1', position: 0 }))
    await putTabCard(createTabCard({ tabId: 'tab-a', cardId: 'card-2', position: 1 }))
    await deleteAllTabCards('tab-a')
    expect(await getAllTabCards()).toEqual([])
  })

  it('leaves tab_cards for other tabs intact', async () => {
    await putTabCard(createTabCard({ tabId: 'tab-a', cardId: 'card-1', position: 0 }))
    await putTabCard(createTabCard({ tabId: 'tab-b', cardId: 'card-2', position: 0 }))
    await deleteAllTabCards('tab-a')
    const remaining = await getAllTabCards()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].tabId).toBe('tab-b')
  })
})
