import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { getAllCards } from '../card/cardStorage'
import { getAllTabCards, getAllTabs } from './tabStorage'
import { useTabs } from './useTabs'

describe('useTabs', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and persists a default tab on first mount', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('default-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.tab.name).toBe('Main')
    expect(result.current.tab.id).toBe('default-tab-uuid')
    const tabs = await getAllTabs()
    expect(tabs).toHaveLength(1)
    expect(tabs[0].id).toBe('default-tab-uuid')
  })

  it('loads an existing tab and its cards on mount', async () => {
    await db.tabs.put({
      id: 'stored-tab',
      name: 'Stored',
      kind: 'blank',
      order: 0,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
    await db.cards.put({
      id: 'stored-card',
      type: 'text',
      title: 'Hello',
      body: 'World',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
    await db.tab_cards.put({
      tabId: 'stored-tab',
      cardId: 'stored-card',
      position: 0,
      foldState: false,
      hiddenState: false,
    })

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.tab.id).toBe('stored-tab')
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.title).toBe('Hello')
  })

  it('addCard appends a card to entries and persists', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => {
      await result.current.addCard({ title: 'Notes', body: 'Buy milk' })
    })

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.title).toBe('Notes')
    expect(result.current.entries[0].position).toBe(0)
    const tcs = await getAllTabCards()
    expect(tcs).toHaveLength(1)
    expect(tcs[0].cardId).toBe('card-uuid')
  })

  it('addCard appends at next position', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-a')
      .mockReturnValueOnce('card-b')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => {
      await result.current.addCard({ title: 'First', body: '' })
    })
    await act(async () => {
      await result.current.addCard({ title: 'Second', body: '' })
    })

    expect(result.current.entries[0].position).toBe(0)
    expect(result.current.entries[1].position).toBe(1)
  })

  it('reorder changes card positions', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-a')
      .mockReturnValueOnce('card-b')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => {
      await result.current.addCard({ title: 'A', body: '' })
    })
    await act(async () => {
      await result.current.addCard({ title: 'B', body: '' })
    })
    await act(async () => {
      await result.current.reorder('card-a', 1)
    })

    expect(result.current.entries[0].card.id).toBe('card-b')
    expect(result.current.entries[1].card.id).toBe('card-a')
  })

  it('fold sets foldState to true', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.fold('card-uuid') })

    expect(result.current.entries[0].foldState).toBe(true)
  })

  it('unfold sets foldState to false', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.fold('card-uuid') })
    await act(async () => { await result.current.unfold('card-uuid') })

    expect(result.current.entries[0].foldState).toBe(false)
  })

  it('hide sets hiddenState to true', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.hide('card-uuid') })

    expect(result.current.entries[0].hiddenState).toBe(true)
  })

  it('unhide sets hiddenState to false', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.hide('card-uuid') })
    await act(async () => { await result.current.unhide('card-uuid') })

    expect(result.current.entries[0].hiddenState).toBe(false)
  })

  it('removeCard removes the card from entries', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'Temp', body: 'Gone' }) })
    expect(result.current.entries).toHaveLength(1)

    await act(async () => { await result.current.removeCard('card-uuid') })
    expect(result.current.entries).toHaveLength(0)
  })

  it('updateCard updates title and body', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'Original', body: 'Old body' }) })

    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_001_000)
    await act(async () => {
      await result.current.updateCard('card-uuid', { title: 'Updated', body: 'New body' })
    })

    expect(result.current.entries[0].card.title).toBe('Updated')
    expect(result.current.entries[0].card.body).toBe('New body')
    expect(result.current.entries[0].card.updatedAt).toBe(1_700_000_001_000)
  })

  it('remount reloads persisted state', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => {
      await result.current.addCard({ title: 'Persist', body: 'After reload' })
    })

    unmount()

    const { result: reloaded } = renderHook(() => useTabs())
    await waitFor(() => expect(reloaded.current.isReady).toBe(true))

    expect(reloaded.current.entries).toHaveLength(1)
    expect(reloaded.current.entries[0].card.title).toBe('Persist')
    expect(reloaded.current.entries[0].foldState).toBe(false)
    expect(reloaded.current.entries[0].hiddenState).toBe(false)
  })

  it('remount preserves fold state', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.fold('card-uuid') })

    unmount()

    const { result: reloaded } = renderHook(() => useTabs())
    await waitFor(() => expect(reloaded.current.isReady).toBe(true))

    expect(reloaded.current.entries[0].foldState).toBe(true)
  })

  it('newly added card has location "none"', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

    expect(result.current.entries[0].card.location).toBe('none')
  })

  it('saveToShelf sets location to "shelf"', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.saveToShelf('card-uuid') })

    expect(result.current.entries[0].card.location).toBe('shelf')
  })

  it('saveToShelf persists across remount', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.saveToShelf('card-uuid') })

    unmount()
    const { result: reloaded } = renderHook(() => useTabs())
    await waitFor(() => expect(reloaded.current.isReady).toBe(true))

    expect(reloaded.current.entries[0].card.location).toBe('shelf')
    const cards = await getAllCards()
    expect(cards[0].location).toBe('shelf')
  })

  it('moveToLibrary sets location to "library"', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.moveToLibrary('card-uuid') })

    expect(result.current.entries[0].card.location).toBe('library')
  })

  it('moveToLibrary persists across remount', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.moveToLibrary('card-uuid') })

    unmount()
    const { result: reloaded } = renderHook(() => useTabs())
    await waitFor(() => expect(reloaded.current.isReady).toBe(true))

    expect(reloaded.current.entries[0].card.location).toBe('library')
  })

  describe('shelfEntries and libraryEntries', () => {
    it('new card appears in entries but not in shelfEntries or libraryEntries', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      expect(result.current.entries).toHaveLength(1)
      expect(result.current.shelfEntries).toHaveLength(0)
      expect(result.current.libraryEntries).toHaveLength(0)
    })

    it('saveToShelf adds card to shelfEntries and keeps it in entries', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.saveToShelf('card-uuid') })

      expect(result.current.shelfEntries).toHaveLength(1)
      expect(result.current.shelfEntries[0].id).toBe('card-uuid')
      expect(result.current.entries).toHaveLength(1)
      expect(result.current.libraryEntries).toHaveLength(0)
    })

    it('shelfEntries persists across remount', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result, unmount } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.saveToShelf('card-uuid') })

      unmount()
      const { result: reloaded } = renderHook(() => useTabs())
      await waitFor(() => expect(reloaded.current.isReady).toBe(true))

      expect(reloaded.current.shelfEntries).toHaveLength(1)
      expect(reloaded.current.shelfEntries[0].id).toBe('card-uuid')
    })

    it('moveToLibrary removes card from shelfEntries and adds to libraryEntries', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.saveToShelf('card-uuid') })
      await act(async () => { await result.current.moveToLibrary('card-uuid') })

      expect(result.current.shelfEntries).toHaveLength(0)
      expect(result.current.libraryEntries).toHaveLength(1)
      expect(result.current.libraryEntries[0].id).toBe('card-uuid')
    })

    it('libraryEntries persists across remount', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result, unmount } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.moveToLibrary('card-uuid') })

      unmount()
      const { result: reloaded } = renderHook(() => useTabs())
      await waitFor(() => expect(reloaded.current.isReady).toBe(true))

      expect(reloaded.current.libraryEntries).toHaveLength(1)
      expect(reloaded.current.libraryEntries[0].id).toBe('card-uuid')
      expect(reloaded.current.shelfEntries).toHaveLength(0)
    })

    it('shelfEntries is sorted by createdAt ascending', async () => {
      await db.tabs.put({
        id: 'sort-tab', name: 'Sort', kind: 'blank', order: 0,
        createdAt: 1_000, updatedAt: 1_000,
      })
      await db.cards.put({
        id: 'card-a', type: 'text', title: 'A', body: '', location: 'shelf',
        createdAt: 2_000, updatedAt: 2_000, dirty: true,
      })
      await db.cards.put({
        id: 'card-b', type: 'text', title: 'B', body: '', location: 'shelf',
        createdAt: 1_000, updatedAt: 1_000, dirty: true,
      })
      await db.tab_cards.put({ tabId: 'sort-tab', cardId: 'card-a', position: 0, foldState: false, hiddenState: false })
      await db.tab_cards.put({ tabId: 'sort-tab', cardId: 'card-b', position: 1, foldState: false, hiddenState: false })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.shelfEntries[0].id).toBe('card-b') // createdAt 1000 comes before 2000
      expect(result.current.shelfEntries[1].id).toBe('card-a')
    })

    it('libraryEntries is sorted by updatedAt descending', async () => {
      await db.tabs.put({
        id: 'sort-tab', name: 'Sort', kind: 'blank', order: 0,
        createdAt: 1_000, updatedAt: 1_000,
      })
      await db.cards.put({
        id: 'card-a', type: 'text', title: 'A', body: '', location: 'library',
        createdAt: 1_000, updatedAt: 3_000, dirty: true,
      })
      await db.cards.put({
        id: 'card-b', type: 'text', title: 'B', body: '', location: 'library',
        createdAt: 1_000, updatedAt: 1_000, dirty: true,
      })
      await db.tab_cards.put({ tabId: 'sort-tab', cardId: 'card-a', position: 0, foldState: false, hiddenState: false })
      await db.tab_cards.put({ tabId: 'sort-tab', cardId: 'card-b', position: 1, foldState: false, hiddenState: false })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.libraryEntries[0].id).toBe('card-a') // updatedAt 3000 > 1000 = most recent first
      expect(result.current.libraryEntries[1].id).toBe('card-b')
    })
  })

  it('removeCard persists removal across remount', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'Temp', body: '' }) })
    await act(async () => { await result.current.removeCard('card-uuid') })

    unmount()

    const { result: reloaded } = renderHook(() => useTabs())
    await waitFor(() => expect(reloaded.current.isReady).toBe(true))

    expect(reloaded.current.entries).toHaveLength(0)
  })
})
