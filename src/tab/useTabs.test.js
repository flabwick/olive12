import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { getAllCards } from '../card/cardStorage'
import { getAllFolders } from '../folder/folderStorage'
import { getAllTabCards, getAllTabs } from './tabStorage'
import { useTabs } from './useTabs'

const syncMocks = vi.hoisted(() => ({
  scheduleSync: vi.fn(),
  runNow: vi.fn().mockResolvedValue(undefined),
  createCardSyncScheduler: vi.fn(),
}))

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('../lib/supabaseClient', () => ({
  supabase: { functions: { invoke: invokeMock } },
}))
vi.mock('../sync/cardSupabaseStorage', () => ({
  makeCardSupabaseStorage: vi.fn(() => ({})),
}))
vi.mock('../sync/cardSync', () => ({
  createCardSyncScheduler: syncMocks.createCardSyncScheduler,
  syncDirtyCardsForUser: vi.fn(),
}))

describe('useTabs', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
    await db.folders.clear()
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

  describe('folders', () => {
    it('createFolder adds a folder to folders state', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('folder-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => {
        await result.current.createFolder({ name: 'Work', parentId: null })
      })

      expect(result.current.folders).toHaveLength(1)
      expect(result.current.folders[0].name).toBe('Work')
      expect(result.current.folders[0].id).toBe('folder-uuid')
    })

    it('createFolder persists across remount', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('folder-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result, unmount } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.createFolder({ name: 'Work' }) })

      unmount()
      const { result: reloaded } = renderHook(() => useTabs())
      await waitFor(() => expect(reloaded.current.isReady).toBe(true))

      const stored = await getAllFolders()
      expect(stored).toHaveLength(1)
      expect(stored[0].name).toBe('Work')
      expect(reloaded.current.folders).toHaveLength(1)
    })

    it('moveToLibrary with folderId sets folderId on the card', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
        .mockReturnValueOnce('folder-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.createFolder({ name: 'Work' }) })
      await act(async () => { await result.current.moveToLibrary('card-uuid', 'folder-uuid') })

      expect(result.current.entries[0].card.folderId).toBe('folder-uuid')
      expect(result.current.entries[0].card.location).toBe('library')
    })

    it('moveToLibrary with null folderId keeps folderId null', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.moveToLibrary('card-uuid', null) })

      expect(result.current.entries[0].card.folderId).toBeNull()
    })

    it('libraryEntries groups correctly by folderId', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-a')
        .mockReturnValueOnce('card-b')
        .mockReturnValueOnce('folder-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
      await act(async () => { await result.current.createFolder({ name: 'Work' }) })
      await act(async () => { await result.current.moveToLibrary('card-a', 'folder-uuid') })
      await act(async () => { await result.current.moveToLibrary('card-b', null) })

      const inFolder = result.current.libraryEntries.find((c) => c.id === 'card-a')
      const atRoot = result.current.libraryEntries.find((c) => c.id === 'card-b')
      expect(inFolder.folderId).toBe('folder-uuid')
      expect(atRoot.folderId).toBeNull()
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

  describe('sync wiring', () => {
    beforeEach(() => {
      syncMocks.scheduleSync.mockClear()
      syncMocks.runNow.mockClear()
      syncMocks.createCardSyncScheduler.mockClear()
      syncMocks.createCardSyncScheduler.mockReturnValue({
        scheduleSync: syncMocks.scheduleSync,
        runNow: syncMocks.runNow,
      })
    })

    it('does not create a scheduler when userId is not provided', async () => {
      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(syncMocks.createCardSyncScheduler).not.toHaveBeenCalled()
    })

    it('creates a scheduler when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(syncMocks.createCardSyncScheduler).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1' }),
      )
    })

    it('calls runNow once when isReady becomes true with userId', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(syncMocks.runNow).toHaveBeenCalledTimes(1)
    })

    it('does not call runNow when userId is absent', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(syncMocks.runNow).not.toHaveBeenCalled()
    })

    it('addCard calls scheduleSync when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      syncMocks.scheduleSync.mockClear()
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      expect(syncMocks.scheduleSync).toHaveBeenCalledTimes(1)
    })

    it('updateCard calls scheduleSync when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      syncMocks.scheduleSync.mockClear()
      await act(async () => { await result.current.updateCard('card-uuid', { title: 'B' }) })

      expect(syncMocks.scheduleSync).toHaveBeenCalledTimes(1)
    })

    it('saveToShelf calls scheduleSync when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      syncMocks.scheduleSync.mockClear()
      await act(async () => { await result.current.saveToShelf('card-uuid') })

      expect(syncMocks.scheduleSync).toHaveBeenCalledTimes(1)
    })

    it('moveToLibrary calls scheduleSync when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      syncMocks.scheduleSync.mockClear()
      await act(async () => { await result.current.moveToLibrary('card-uuid') })

      expect(syncMocks.scheduleSync).toHaveBeenCalledTimes(1)
    })

    it('card mutations do not throw and work correctly without userId', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      expect(result.current.entries).toHaveLength(1)
      expect(syncMocks.scheduleSync).not.toHaveBeenCalled()
    })

    it('creates a tab_card and shows a remote-pulled card in entries after runNow', async () => {
      // Simulate a card that was pulled from Supabase into Dexie but has no tab_card yet
      await db.tabs.put({
        id: 'existing-tab', name: 'Main', kind: 'blank', order: 0,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.cards.put({
        id: 'remote-card-id', type: 'text', title: 'Remote Card', body: 'From server',
        location: 'none', folderId: null,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
        dirty: false,
      })
      // No tab_card entry — this card arrived via Supabase, not through addCard

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      // After runNow resolves, the .then() callback finds the orphan card and
      // creates a tab_card for it, making it appear in entries.
      await waitFor(() => expect(result.current.entries).toHaveLength(1))
      expect(result.current.entries[0].card.title).toBe('Remote Card')
      expect(result.current.entries[0].card.body).toBe('From server')
    })

    it('does not duplicate tab_cards for cards that already have one', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Local', body: '' }) })

      // After runNow .then() runs, card was already in tabCards — no duplicate
      await waitFor(() => expect(result.current.entries).toHaveLength(1))
      expect(result.current.entries).toHaveLength(1)
    })
  })

  describe('runDockPrompt', () => {
    beforeEach(() => {
      invokeMock.mockClear()
    })

    it('calls supabase.functions.invoke with prompt and contextCards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      invokeMock.mockResolvedValue({ data: { title: 'AI title', body: 'AI body' }, error: null })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Context card', body: 'Some info' }) })

      await act(async () => { await result.current.runDockPrompt('Summarise') })

      expect(invokeMock).toHaveBeenCalledOnce()
      const [fnName, opts] = invokeMock.mock.calls[0]
      expect(fnName).toBe('dock-prompt')
      expect(opts.body.prompt).toBe('Summarise')
      expect(opts.body.contextCards).toEqual([
        { id: 'card-uuid', title: 'Context card', body: 'Some info' },
      ])
    })

    it('creates a new card from the AI response on success', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('existing-card')
        .mockReturnValueOnce('new-card')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      invokeMock.mockResolvedValue({ data: { title: 'AI title', body: 'AI body' }, error: null })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Context', body: '' }) })

      await act(async () => { await result.current.runDockPrompt('Make a card') })

      expect(result.current.entries).toHaveLength(2)
      const aiCard = result.current.entries.find((e) => e.card.id === 'new-card')
      expect(aiCard.card.title).toBe('AI title')
      expect(aiCard.card.body).toBe('AI body')
    })

    it('returns true on success', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      invokeMock.mockResolvedValue({ data: { title: 'T', body: 'B' }, error: null })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      let returnValue
      await act(async () => { returnValue = await result.current.runDockPrompt('test') })

      expect(returnValue).toBe(true)
      expect(result.current.promptLoading).toBe(false)
      expect(result.current.promptError).toBe('')
    })

    it('sets promptError and returns false when invoke errors', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      invokeMock.mockResolvedValue({ data: null, error: { message: 'Network failure' } })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      let returnValue
      await act(async () => { returnValue = await result.current.runDockPrompt('test') })

      expect(returnValue).toBe(false)
      expect(result.current.promptError).toBe('Network failure')
      expect(result.current.promptLoading).toBe(false)
    })

    it('excludes hidden cards from contextCards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('visible-card')
        .mockReturnValueOnce('hidden-card')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      invokeMock.mockResolvedValue({ data: { title: 'T', body: 'B' }, error: null })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Visible', body: 'A' }) })
      await act(async () => { await result.current.addCard({ title: 'Hidden', body: 'B' }) })
      await act(async () => { await result.current.hide('hidden-card') })

      await act(async () => { await result.current.runDockPrompt('go') })

      const { contextCards } = invokeMock.mock.calls[0][1].body
      expect(contextCards).toHaveLength(1)
      expect(contextCards[0].id).toBe('visible-card')
    })
  })
})
