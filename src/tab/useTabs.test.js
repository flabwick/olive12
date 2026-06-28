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

const folderSyncMocks = vi.hoisted(() => ({
  syncFolders: vi.fn().mockResolvedValue(undefined),
  deleteFolderRemote: vi.fn().mockResolvedValue(undefined),
}))

const tabStorageMocks = vi.hoisted(() => ({
  fetchSavedTabsForUser: vi.fn().mockResolvedValue([]),
  upsertSavedTab: vi.fn().mockResolvedValue(undefined),
  deleteSavedTab: vi.fn().mockResolvedValue(undefined),
}))

const invokeMock = vi.hoisted(() => vi.fn())
const deleteRemoteMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const getSessionMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: { session: null } }))

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    functions: { invoke: invokeMock },
    auth: { getSession: getSessionMock },
  },
}))
vi.mock('../sync/cardSupabaseStorage', () => ({
  makeCardSupabaseStorage: vi.fn(() => ({ deleteRemoteCard: deleteRemoteMock })),
}))
vi.mock('../sync/cardSync', () => ({
  createCardSyncScheduler: syncMocks.createCardSyncScheduler,
  syncDirtyCardsForUser: vi.fn(),
}))
vi.mock('../sync/folderSync', () => ({
  syncFolders: folderSyncMocks.syncFolders,
  deleteFolderRemote: folderSyncMocks.deleteFolderRemote,
}))
vi.mock('../sync/folderSupabaseStorage', () => ({
  makeFolderSupabaseStorage: vi.fn(() => ({})),
}))
vi.mock('./tabSupabaseStorage', () => ({
  makeTabSupabaseStorage: vi.fn(() => tabStorageMocks),
}))

describe('useTabs', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
    await db.folders.clear()
    await db.links.clear()
    await db.index_entries.clear()
    await db.dock_cards.clear()
    localStorage.clear()
    folderSyncMocks.syncFolders.mockClear()
    folderSyncMocks.deleteFolderRemote.mockClear()
    tabStorageMocks.fetchSavedTabsForUser.mockClear()
    tabStorageMocks.upsertSavedTab.mockClear()
    tabStorageMocks.deleteSavedTab.mockClear()
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

  it('addPortalCard creates a portal card with correct type and config', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => {
      await result.current.addPortalCard('target-card-id')
    })

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.type).toBe('portal')
    expect(result.current.entries[0].card.config.target_card_id).toBe('target-card-id')
  })

  it('addPortalCard appends portal card at the end of entries', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('text-uuid')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'Existing', body: '' }) })
    await act(async () => { await result.current.addPortalCard('target-id') })

    expect(result.current.entries).toHaveLength(2)
    expect(result.current.entries[1].card.type).toBe('portal')
    expect(result.current.entries[1].position).toBe(1)
  })

  it('addPortalCard is a no-op when a portal with the same target already exists in the active tab', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addPortalCard('target-id') })
    await act(async () => { await result.current.addPortalCard('target-id') })

    expect(result.current.entries).toHaveLength(1)
  })

  it('addPortalCard is a no-op when the target card itself is already in the active tab', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.addPortalCard('card-uuid') })

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.type).toBe('text')
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

  describe('flip state', () => {
    it('flipCard toggles a card id into flippedCardIds', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      expect(result.current.isFlippedCard('card-uuid')).toBe(false)
      act(() => { result.current.flipCard('card-uuid') })
      expect(result.current.isFlippedCard('card-uuid')).toBe(true)
    })

    it('flipCard called twice on the same id un-flips it', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      act(() => { result.current.flipCard('card-uuid') })
      act(() => { result.current.flipCard('card-uuid') })
      expect(result.current.isFlippedCard('card-uuid')).toBe(false)
    })

    it('isFlippedCard returns false for cards that have not been flipped', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.isFlippedCard('nonexistent-card')).toBe(false)
    })
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

  it('saveToShelf sets location to "shelf" on the saved card', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.saveToShelf('card-uuid') })

    expect(result.current.shelfEntries[0].location).toBe('shelf')
    expect(result.current.shelfEntries[0].id).toBe('card-uuid')
  })

  it('saveToShelf replaces the tab instance with a portal card pointing at the saved card', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.saveToShelf('card-uuid') })

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.type).toBe('portal')
    expect(result.current.entries[0].card.config.target_card_id).toBe('card-uuid')
  })

  it('saveToShelf preserves the position of the replaced tab instance', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-a')
      .mockReturnValueOnce('card-b')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'First', body: '' }) })
    await act(async () => { await result.current.addCard({ title: 'Second', body: '' }) })
    await act(async () => { await result.current.saveToShelf('card-b') })

    const portalEntry = result.current.entries.find((e) => e.card.type === 'portal')
    expect(portalEntry?.position).toBe(1)
  })

  it('saveToShelf persists original card as shelf entry across remount', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
      .mockReturnValueOnce('portal-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
    await act(async () => { await result.current.saveToShelf('card-uuid') })

    unmount()
    const { result: reloaded } = renderHook(() => useTabs())
    await waitFor(() => expect(reloaded.current.isReady).toBe(true))

    expect(reloaded.current.shelfEntries[0].id).toBe('card-uuid')
    const cards = await getAllCards()
    const original = cards.find((c) => c.id === 'card-uuid')
    expect(original?.location).toBe('shelf')
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

    it('saveToShelf adds card to shelfEntries and replaces tab entry with a portal card', async () => {
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
      expect(result.current.entries[0].card.type).toBe('portal')
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

  describe('shelfTabs and libraryTabs', () => {
    it('new tab is not in shelfTabs or libraryTabs', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.shelfTabs).toHaveLength(0)
      expect(result.current.libraryTabs).toHaveLength(0)
    })

    it('saveTabToShelf adds tab to shelfTabs', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })

      expect(result.current.shelfTabs).toHaveLength(1)
      expect(result.current.shelfTabs[0].id).toBe('tab-uuid')
      expect(result.current.libraryTabs).toHaveLength(0)
    })

    it('moveTabToLibrary moves tab from shelfTabs to libraryTabs', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })
      await act(async () => { await result.current.moveTabToLibrary('tab-uuid', null) })

      expect(result.current.shelfTabs).toHaveLength(0)
      expect(result.current.libraryTabs).toHaveLength(1)
      expect(result.current.libraryTabs[0].id).toBe('tab-uuid')
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
      deleteRemoteMock.mockClear()
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

    it('addTabCard creates tab_card for existing card without creating new card record', async () => {
      // Pre-seed a tab and a card (no tab_card) before mount, no userId so reconcile won't run
      await db.tabs.put({
        id: 'pre-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.cards.put({
        id: 'dock-card', type: 'text', title: 'Dock', body: '', back: '', config: null,
        location: 'none', folderId: null,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000, dirty: true,
      })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.cardsById['dock-card']).toBeDefined()
      expect(result.current.entries).toHaveLength(0)

      await act(async () => { await result.current.addTabCard('dock-card') })

      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries[0].card.id).toBe('dock-card')

      const cards = await getAllCards()
      expect(cards).toHaveLength(1)

      const tcs = await getAllTabCards()
      expect(tcs).toHaveLength(1)
      expect(tcs[0].cardId).toBe('dock-card')
      expect(tcs[0].tabId).toBe('pre-tab')
    })

    it('reconcile on load skips dock-pinned cards (does not create tab_card for them)', async () => {
      syncMocks.createCardSyncScheduler.mockReturnValue({
        scheduleSync: syncMocks.scheduleSync,
        runNow: syncMocks.runNow,
      })

      await db.tabs.put({
        id: 'test-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_000, updatedAt: 1_000,
      })
      await db.cards.put({
        id: 'dock-only', type: 'text', title: 'Dock', body: '', back: '', config: null,
        location: 'none', folderId: null,
        createdAt: 1_000, updatedAt: 1_000, dirty: false,
      })
      await db.dock_cards.put({ cardId: 'dock-only', order: 0 })

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await waitFor(() => expect(syncMocks.runNow).toHaveBeenCalled())

      await act(async () => {
        await new Promise((r) => setTimeout(r, 50))
      })

      expect(result.current.entries.some((e) => e.card?.id === 'dock-only')).toBe(false)
      const tcs = await getAllTabCards()
      expect(tcs.some((tc) => tc.cardId === 'dock-only')).toBe(false)
    })

    it('reconcile still creates tab_card for genuine orphans not in dock', async () => {
      syncMocks.createCardSyncScheduler.mockReturnValue({
        scheduleSync: syncMocks.scheduleSync,
        runNow: syncMocks.runNow,
      })

      await db.tabs.put({
        id: 'test-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_000, updatedAt: 1_000,
      })
      await db.cards.put({
        id: 'genuine-orphan', type: 'text', title: 'Orphan', body: '', back: '', config: null,
        location: 'none', folderId: null,
        createdAt: 1_000, updatedAt: 1_000, dirty: false,
      })

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await waitFor(() => expect(result.current.entries).toHaveLength(1))

      expect(result.current.entries[0].card.id).toBe('genuine-orphan')
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

    it('removeCard with userId also deletes the card from Supabase', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Temp', body: '' }) })

      deleteRemoteMock.mockClear()
      await act(async () => { await result.current.removeCard('card-uuid') })

      expect(deleteRemoteMock).toHaveBeenCalledOnce()
      expect(deleteRemoteMock).toHaveBeenCalledWith('card-uuid')
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

  describe('links', () => {
    it('addPortalCard writes a link entry pointing at the target', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('portal-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addPortalCard('target-card-id') })

      const links = await db.links.toArray()
      expect(links).toHaveLength(1)
      expect(links[0].sourceCardId).toBe('portal-uuid')
      expect(links[0].targetCardId).toBe('target-card-id')
      expect(links[0].linkType).toBe('portal')
    })

    it('updateCard changing target_card_id replaces the old link with a new one', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('portal-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addPortalCard('target-a') })

      let links = await db.links.toArray()
      expect(links).toHaveLength(1)
      expect(links[0].targetCardId).toBe('target-a')

      await act(async () => {
        await result.current.updateCard('portal-uuid', { config: { target_card_id: 'target-b' } })
      })

      links = await db.links.toArray()
      expect(links).toHaveLength(1)
      expect(links[0].targetCardId).toBe('target-b')
    })

    it('removeCard deletes the outgoing link for the removed portal card', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('portal-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addPortalCard('target-card-id') })
      expect(await db.links.toArray()).toHaveLength(1)

      await act(async () => { await result.current.removeCard('portal-uuid') })
      expect(await db.links.toArray()).toHaveLength(0)
    })

    it('saveToShelf writes a link for the portal card that replaces the original', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
        .mockReturnValueOnce('portal-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.saveToShelf('card-uuid') })

      const links = await db.links.toArray()
      expect(links).toHaveLength(1)
      expect(links[0].sourceCardId).toBe('portal-uuid')
      expect(links[0].targetCardId).toBe('card-uuid')
      expect(links[0].linkType).toBe('portal')
    })
  })

  describe('runDockPrompt', () => {
    // runDockPrompt uses raw fetch (not supabase.functions.invoke) to preserve the stream body.
    function makeStreamResponse(sseLines) {
      const encoder = new TextEncoder()
      const body = new ReadableStream({
        start(controller) {
          for (const line of sseLines) {
            controller.enqueue(encoder.encode(line + '\n'))
          }
          controller.close()
        },
      })
      return new Response(body, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    }

    let fetchMock

    beforeEach(() => {
      invokeMock.mockClear()
      fetchMock = vi.fn()
      vi.stubGlobal('requestAnimationFrame', (fn) => { fn(0); return 0 })
      vi.stubGlobal('cancelAnimationFrame', () => {})
      vi.stubGlobal('fetch', fetchMock)
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('calls fetch with prompt, contextCards, and auth header', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
        .mockReturnValueOnce('ai-card')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      fetchMock.mockResolvedValue(makeStreamResponse([
        'data: {"choices":[{"delta":{"content":"AI title"}}]}',
        'data: {"choices":[{"delta":{"content":"\\n\\nAI body"}}]}',
        'data: [DONE]',
      ]))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Context card', body: 'Some info' }) })

      await act(async () => { await result.current.runDockPrompt('Summarise') })

      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, opts] = fetchMock.mock.calls[0]
      expect(url).toContain('dock-prompt')
      expect(opts.method).toBe('POST')
      const bodyParsed = JSON.parse(opts.body)
      expect(bodyParsed.prompt).toBe('Summarise')
      expect(bodyParsed.contextCards).toEqual([
        { id: 'card-uuid', title: 'Context card', body: 'Some info' },
      ])
    })

    it('creates a card immediately with empty content, then fills in title and body from stream', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('ai-card')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      fetchMock.mockResolvedValue(makeStreamResponse([
        'data: {"choices":[{"delta":{"content":"AI title"}}]}',
        'data: {"choices":[{"delta":{"content":"\\n\\nAI body"}}]}',
        'data: [DONE]',
      ]))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.runDockPrompt('Make a card') })

      expect(result.current.entries).toHaveLength(1)
      const aiCard = result.current.entries.find((e) => e.card.id === 'ai-card')
      expect(aiCard.card.title).toBe('AI title')
      expect(aiCard.card.body).toBe('AI body')
    })

    it('returns true and clears promptLoading on success', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      fetchMock.mockResolvedValue(makeStreamResponse([
        'data: {"choices":[{"delta":{"content":"Title\\n\\nBody"}}]}',
        'data: [DONE]',
      ]))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      let returnValue
      await act(async () => { returnValue = await result.current.runDockPrompt('test') })

      expect(returnValue).toBe(true)
      expect(result.current.promptLoading).toBe(false)
      expect(result.current.promptError).toBe('')
    })

    it('sets promptError and returns false when fetch throws', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      fetchMock.mockRejectedValue(new Error('Network failure'))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      let returnValue
      await act(async () => { returnValue = await result.current.runDockPrompt('test') })

      expect(returnValue).toBe(false)
      expect(result.current.promptError).toBe('Network failure')
      expect(result.current.promptLoading).toBe(false)
    })

    it('uses accumulated text as title when stream never emits a newline', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      fetchMock.mockResolvedValue(makeStreamResponse([
        'data: {"choices":[{"delta":{"content":"No newline here"}}]}',
        'data: [DONE]',
      ]))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.runDockPrompt('test') })

      const card = result.current.entries[0].card
      expect(card.title).toBe('No newline here')
      expect(card.body).toBe('')
    })

    it('excludes hidden cards from contextCards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('visible-card')
        .mockReturnValueOnce('hidden-card')
        .mockReturnValueOnce('ai-card')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      fetchMock.mockResolvedValue(makeStreamResponse([
        'data: {"choices":[{"delta":{"content":"T\\n\\nB"}}]}',
        'data: [DONE]',
      ]))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Visible', body: 'A' }) })
      await act(async () => { await result.current.addCard({ title: 'Hidden', body: 'B' }) })
      await act(async () => { await result.current.hide('hidden-card') })

      await act(async () => { await result.current.runDockPrompt('go') })

      const bodyParsed = JSON.parse(fetchMock.mock.calls[0][1].body)
      expect(bodyParsed.contextCards).toHaveLength(1)
      expect(bodyParsed.contextCards[0].id).toBe('visible-card')
    })
  })

  describe('multi-tab', () => {
    it('loads multiple tabs on mount sorted by order', async () => {
      await db.tabs.put({ id: 'tab-b', name: 'B', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'tab-a', name: 'A', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.tabs[0].id).toBe('tab-a')
      expect(result.current.tabs[1].id).toBe('tab-b')
    })

    it('creates a default tab on first mount when no tabs exist', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('default-tab')
      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].id).toBe('default-tab')
      expect(result.current.activeTabId).toBe('default-tab')
    })

    it('addTab creates a new tab and switches to it', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addTab() })

      expect(result.current.tabs).toHaveLength(2)
      expect(result.current.activeTabId).toBe('tab-2')
    })

    it('switchTab changes active tab', async () => {
      await db.tabs.put({ id: 'tab-a', name: 'A', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'tab-b', name: 'B', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      expect(result.current.activeTabId).toBe('tab-a')

      act(() => { result.current.switchTab('tab-b') })
      expect(result.current.activeTabId).toBe('tab-b')
    })

    it('entries are scoped to the active tab', async () => {
      await db.tabs.put({ id: 'tab-a', name: 'A', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'tab-b', name: 'B', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })
      await db.cards.put({ id: 'card-a', type: 'text', title: 'In A', body: '', location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false })
      await db.cards.put({ id: 'card-b', type: 'text', title: 'In B', body: '', location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false })
      await db.tab_cards.put({ tabId: 'tab-a', cardId: 'card-a', position: 0, foldState: false, hiddenState: false })
      await db.tab_cards.put({ tabId: 'tab-b', cardId: 'card-b', position: 0, foldState: false, hiddenState: false })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries[0].card.title).toBe('In A')

      act(() => { result.current.switchTab('tab-b') })
      expect(result.current.entries).toHaveLength(1)
      expect(result.current.entries[0].card.title).toBe('In B')
    })

    it('removeTab removes the tab and its tab_cards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addTab() })
      expect(result.current.tabs).toHaveLength(2)

      await act(async () => { await result.current.removeTab('tab-2') })
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].id).toBe('tab-1')
    })

    it('removeTab switches to adjacent tab when active tab is removed', async () => {
      await db.tabs.put({ id: 'tab-a', name: 'A', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'tab-b', name: 'B', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      expect(result.current.activeTabId).toBe('tab-a')

      await act(async () => { await result.current.removeTab('tab-a') })
      expect(result.current.activeTabId).toBe('tab-b')
    })

    it('removeTab of a saved tab keeps it in shelfTabs and switches to a new default tab', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-fallback')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      expect(result.current.shelfTabs).toHaveLength(1)

      await act(async () => { await result.current.removeTab('tab-1') })

      // Saved tab stays in shelfTabs (not deleted from state/Dexie)
      expect(result.current.shelfTabs).toHaveLength(1)
      expect(result.current.shelfTabs[0].id).toBe('tab-1')
      // A new default tab was created to take over as active
      expect(result.current.activeTabId).toBe('tab-fallback')
    })

    it('removeTab of a saved tab when another unsaved tab exists switches to it', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addTab() })
      await act(async () => { result.current.switchTab('tab-1') })
      await act(async () => { await result.current.saveTabToShelf('tab-1') })

      await act(async () => { await result.current.removeTab('tab-1') })

      expect(result.current.shelfTabs).toHaveLength(1)
      expect(result.current.activeTabId).toBe('tab-2')
    })

    it('removeTab creates a default tab if removing the last tab', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('new-default')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.removeTab('tab-1') })
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.activeTabId).toBe('new-default')
    })

    it('removeTab of a saved tab marks it isOpen: false in state', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-fallback')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      await act(async () => { await result.current.removeTab('tab-1') })

      const closed = result.current.tabs.find((t) => t.id === 'tab-1')
      expect(closed?.isOpen).toBe(false)
    })

    it('removeTab of a saved tab persists isOpen false to Dexie', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-fallback')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      await act(async () => { await result.current.removeTab('tab-1') })

      const stored = await getAllTabs()
      expect(stored.find((t) => t.id === 'tab-1')?.isOpen).toBe(false)
    })

    it('removeTab of a saved tab excludes it from openTabs', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-fallback')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      expect(result.current.openTabs.map((t) => t.id)).toContain('tab-1')

      await act(async () => { await result.current.removeTab('tab-1') })
      expect(result.current.openTabs.map((t) => t.id)).not.toContain('tab-1')
    })

    it('removeTab of a saved tab switches to another open saved tab if one exists', async () => {
      await db.tabs.put({ id: 'shelf-a', name: 'Shelf A', kind: 'blank', order: 0, savedLocation: 'shelf', savedFolderId: null, isOpen: true, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'shelf-b', name: 'Shelf B', kind: 'blank', order: 1, savedLocation: 'shelf', savedFolderId: null, isOpen: true, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      act(() => { result.current.switchTab('shelf-a') })
      await act(async () => { await result.current.removeTab('shelf-a') })

      expect(result.current.activeTabId).toBe('shelf-b')
    })

    it('reopenSavedTab marks a closed tab as open in state', async () => {
      await db.tabs.put({ id: 'saved-tab', name: 'My Tab', kind: 'blank', order: 0, savedLocation: 'shelf', savedFolderId: null, isOpen: false, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'open-tab', name: 'Open', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, isOpen: true, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.openTabs.map((t) => t.id)).not.toContain('saved-tab')

      await act(async () => { await result.current.reopenSavedTab('saved-tab') })

      expect(result.current.tabs.find((t) => t.id === 'saved-tab')?.isOpen).toBe(true)
      expect(result.current.openTabs.map((t) => t.id)).toContain('saved-tab')
    })

    it('reopenSavedTab sets the reopened tab as active', async () => {
      await db.tabs.put({ id: 'saved-tab', name: 'My Tab', kind: 'blank', order: 0, savedLocation: 'shelf', savedFolderId: null, isOpen: false, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'open-tab', name: 'Open', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, isOpen: true, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      expect(result.current.activeTabId).toBe('open-tab')

      await act(async () => { await result.current.reopenSavedTab('saved-tab') })

      expect(result.current.activeTabId).toBe('saved-tab')
    })

    it('reopenSavedTab persists isOpen true to Dexie', async () => {
      await db.tabs.put({ id: 'saved-tab', name: 'My Tab', kind: 'blank', order: 0, savedLocation: 'shelf', savedFolderId: null, isOpen: false, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.reopenSavedTab('saved-tab') })

      const stored = await getAllTabs()
      expect(stored.find((t) => t.id === 'saved-tab')?.isOpen).toBe(true)
    })

    it('init falls back to first open tab when savedActiveTabId points to a closed tab', async () => {
      await db.tabs.put({ id: 'closed-tab', name: 'Closed', kind: 'blank', order: 0, savedLocation: 'shelf', savedFolderId: null, isOpen: false, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'open-tab', name: 'Open', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, isOpen: true, createdAt: 1_000, updatedAt: 1_000 })
      localStorage.setItem('olive12:activeTabId', 'closed-tab')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.activeTabId).toBe('open-tab')
    })

    it('openTabs only includes tabs where isOpen is true', async () => {
      await db.tabs.put({ id: 'tab-open', name: 'Open', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, isOpen: true, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'tab-closed', name: 'Closed', kind: 'blank', order: 1, savedLocation: 'shelf', savedFolderId: null, isOpen: false, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      const openIds = result.current.openTabs.map((t) => t.id)
      expect(openIds).toContain('tab-open')
      expect(openIds).not.toContain('tab-closed')
    })

    it('addTab assigns correct order when called after other tabs exist', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.addTab() })

      const stored = await getAllTabs()
      const tab2 = stored.find((t) => t.id === 'tab-2')
      expect(tab2?.order).toBe(1)
    })

    it('renameTab updates name in state and persists', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_001_000)
      await act(async () => { await result.current.renameTab('tab-1', 'Renamed') })

      expect(result.current.tabs[0].name).toBe('Renamed')
      const stored = await getAllTabs()
      expect(stored[0].name).toBe('Renamed')
    })

    it('saveTabToShelf sets savedLocation to shelf in state and persists', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })

      expect(result.current.tabs[0].savedLocation).toBe('shelf')
      const stored = await getAllTabs()
      expect(stored[0].savedLocation).toBe('shelf')
    })

    it('restores activeTabId from localStorage on remount', async () => {
      await db.tabs.put({ id: 'tab-a', name: 'A', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })
      await db.tabs.put({ id: 'tab-b', name: 'B', kind: 'blank', order: 1, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })

      const { result, unmount } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      act(() => { result.current.switchTab('tab-b') })
      expect(result.current.activeTabId).toBe('tab-b')

      unmount()

      const { result: reloaded } = renderHook(() => useTabs())
      await waitFor(() => expect(reloaded.current.isReady).toBe(true))

      expect(reloaded.current.activeTabId).toBe('tab-b')
    })

    it('falls back to first tab if saved activeTabId no longer exists', async () => {
      localStorage.setItem('olive12:activeTabId', 'deleted-tab')
      await db.tabs.put({ id: 'tab-a', name: 'A', kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.activeTabId).toBe('tab-a')
    })

    it('moveTabToLibrary sets savedLocation to library and persists', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.moveTabToLibrary('tab-1', 'folder-x') })

      expect(result.current.tabs[0].savedLocation).toBe('library')
      expect(result.current.tabs[0].savedFolderId).toBe('folder-x')
      const stored = await getAllTabs()
      expect(stored[0].savedLocation).toBe('library')
    })
  })

  describe('brain feed', () => {
    beforeEach(() => {
      invokeMock.mockClear()
    })

    async function seedLibraryCard(cardId, title, body, location = 'library') {
      await db.tabs.put({
        id: 'tab-uuid',
        name: 'Main',
        kind: 'blank',
        order: 0,
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      })
      await db.cards.put({
        id: cardId,
        type: 'text',
        title,
        body,
        config: null,
        location,
        folderId: null,
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      })
      await db.tab_cards.put({
        tabId: 'tab-uuid',
        cardId,
        position: 0,
        foldState: false,
        hiddenState: false,
      })
    }

    it('includes a stale item when index entry hash drifts from card content', async () => {
      await seedLibraryCard('lib-1', 'Drifted note', 'current body')
      const { createIndexEntry } = await import('../brain/createIndexEntry')
      const { putIndexEntry } = await import('../brain/indexEntryStorage')
      await putIndexEntry(createIndexEntry({
        cardId: 'lib-1',
        title: 'Drifted note',
        contentHash: 'stale-hash',
      }))

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.brainFeedItems).toEqual([
        { cardId: 'lib-1', title: 'Drifted note', reason: 'stale' },
      ])
    })

    it('includes an orphan item for library cards with no links', async () => {
      await seedLibraryCard('lib-1', 'Lonely note', 'body')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.brainFeedItems).toEqual([
        { cardId: 'lib-1', title: 'Lonely note', reason: 'orphan' },
      ])
    })

    it('reindexCard calls wiki-index and updates the index entry', async () => {
      await seedLibraryCard('lib-1', 'Reindex me', 'body')
      await db.links.put({
        sourceCardId: 'other',
        targetCardId: 'lib-1',
        linkType: 'embed',
        createdAt: 1,
      })
      invokeMock.mockResolvedValue({
        data: { title: 'Indexed title', tags: ['tag'], summary: 'Summary', links: [] },
        error: null,
      })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.reindexCard('lib-1') })

      expect(invokeMock).toHaveBeenCalledOnce()
      expect(invokeMock.mock.calls[0][0]).toBe('wiki-index')
      const { getIndexEntry } = await import('../brain/indexEntryStorage')
      const { computeContentHash } = await import('../sync/cardSyncLogic')
      const entry = await getIndexEntry('lib-1')
      expect(entry.title).toBe('Indexed title')
      expect(entry.contentHash).toBe(computeContentHash(result.current.cardsById['lib-1']))
      expect(result.current.brainFeedItems).toEqual([])
    })

    it('updateCard on a library card invokes wiki-index', async () => {
      await seedLibraryCard('lib-1', 'Library card', 'original')
      invokeMock.mockResolvedValue({
        data: { title: 'Updated index', tags: [], summary: '', links: [] },
        error: null,
      })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => {
        await result.current.updateCard('lib-1', { body: 'changed body' })
      })

      await waitFor(() => expect(invokeMock).toHaveBeenCalled())
      expect(invokeMock.mock.calls.some(([fnName]) => fnName === 'wiki-index')).toBe(true)
    })

    it('updateCard on a non-library card does not invoke wiki-index', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Tab card', body: 'body' }) })

      invokeMock.mockClear()
      await act(async () => {
        await result.current.updateCard('card-uuid', { body: 'changed' })
      })

      expect(invokeMock).not.toHaveBeenCalled()
    })
  })

  describe('tab sync wiring', () => {
    beforeEach(() => {
      syncMocks.scheduleSync.mockClear()
      syncMocks.runNow.mockClear()
      syncMocks.createCardSyncScheduler.mockClear()
      syncMocks.createCardSyncScheduler.mockReturnValue({
        scheduleSync: syncMocks.scheduleSync,
        runNow: syncMocks.runNow,
      })
    })

    it('saveTabToShelf calls upsertSavedTab with saved_location shelf', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      tabStorageMocks.upsertSavedTab.mockClear()
      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })

      expect(tabStorageMocks.upsertSavedTab).toHaveBeenCalledOnce()
      const row = tabStorageMocks.upsertSavedTab.mock.calls[0][0]
      expect(row.id).toBe('tab-uuid')
      expect(row.saved_location).toBe('shelf')
      expect(row.user_id).toBe('user-1')
    })

    it('moveTabToLibrary calls upsertSavedTab with saved_location library', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      tabStorageMocks.upsertSavedTab.mockClear()
      await act(async () => { await result.current.moveTabToLibrary('tab-uuid', 'folder-1') })

      expect(tabStorageMocks.upsertSavedTab).toHaveBeenCalledOnce()
      const row = tabStorageMocks.upsertSavedTab.mock.calls[0][0]
      expect(row.saved_location).toBe('library')
      expect(row.saved_folder_id).toBe('folder-1')
    })

    it('renameTab calls upsertSavedTab when tab is saved', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })

      tabStorageMocks.upsertSavedTab.mockClear()
      await act(async () => { await result.current.renameTab('tab-uuid', 'Renamed') })

      expect(tabStorageMocks.upsertSavedTab).toHaveBeenCalledOnce()
      expect(tabStorageMocks.upsertSavedTab.mock.calls[0][0].name).toBe('Renamed')
    })

    it('renameTab does not call upsertSavedTab when tab is unsaved', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      tabStorageMocks.upsertSavedTab.mockClear()
      await act(async () => { await result.current.renameTab('tab-uuid', 'Renamed') })

      expect(tabStorageMocks.upsertSavedTab).not.toHaveBeenCalled()
    })

    it('deleteSavedTab clears savedLocation and calls deleteSavedTab on storage', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })
      expect(result.current.tabs.find((t) => t.id === 'tab-uuid')?.savedLocation).toBe('shelf')

      tabStorageMocks.deleteSavedTab.mockClear()
      await act(async () => { await result.current.deleteSavedTab('tab-uuid') })

      expect(result.current.tabs.find((t) => t.id === 'tab-uuid')?.savedLocation).toBe('none')
      expect(tabStorageMocks.deleteSavedTab).toHaveBeenCalledWith('tab-uuid')
    })

    it('saveTabToShelf does not call upsertSavedTab when userId is absent', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })

      expect(tabStorageMocks.upsertSavedTab).not.toHaveBeenCalled()
    })
  })

  describe('new card operations', () => {
    it('renameCard updates the card title in state and storage', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'Old title', body: '' }) })

      await act(async () => { await result.current.renameCard('card-uuid', 'New title') })

      expect(result.current.cardsById['card-uuid'].title).toBe('New title')
      const stored = await getAllCards()
      expect(stored.find((c) => c.id === 'card-uuid')?.title).toBe('New title')
    })

    it('moveCardToFolder updates folderId in state and storage', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      await act(async () => { await result.current.moveCardToFolder('card-uuid', 'folder-1') })

      expect(result.current.cardsById['card-uuid'].folderId).toBe('folder-1')
      const stored = await getAllCards()
      expect(stored.find((c) => c.id === 'card-uuid')?.folderId).toBe('folder-1')
    })

    it('moveCardToShelf sets location to shelf and clears folderId', async () => {
      await db.cards.put({
        id: 'lib-card', type: 'text', title: 'Library', body: '', location: 'library',
        folderId: 'folder-1', createdAt: 1_000, updatedAt: 1_000, dirty: false,
      })
      await db.tabs.put({
        id: 'pre-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_000, updatedAt: 1_000,
      })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.moveCardToShelf('lib-card') })

      expect(result.current.cardsById['lib-card'].location).toBe('shelf')
      expect(result.current.cardsById['lib-card'].folderId).toBeNull()
    })
  })

  describe('folder operations', () => {
    it('renameFolder updates folder name in state and storage', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('folder-uuid')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.createFolder({ name: 'Old name' }) })

      await act(async () => { await result.current.renameFolder('folder-uuid', 'New name') })

      expect(result.current.folders.find((f) => f.id === 'folder-uuid')?.name).toBe('New name')
      const stored = await getAllFolders()
      expect(stored.find((f) => f.id === 'folder-uuid')?.name).toBe('New name')
    })

    it('createFolder calls syncFolders when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('folder-uuid')
      syncMocks.createCardSyncScheduler.mockReturnValue({
        scheduleSync: syncMocks.scheduleSync,
        runNow: syncMocks.runNow,
      })

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      folderSyncMocks.syncFolders.mockClear()
      await act(async () => { await result.current.createFolder({ name: 'Work' }) })

      expect(folderSyncMocks.syncFolders).toHaveBeenCalled()
    })

    it('deleteFolder reassign mode re-parents child folders and cards to the parent folder', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('parent-folder')
        .mockReturnValueOnce('child-folder')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.createFolder({ name: 'Parent' }) })
      await act(async () => {
        await result.current.createFolder({ name: 'Child', parentId: 'parent-folder' })
      })
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.moveCardToFolder('card-uuid', 'child-folder') })

      // Now delete 'child-folder' in reassign mode
      await act(async () => { await result.current.deleteFolder('child-folder', 'reassign') })

      // child-folder should be gone
      expect(result.current.folders.find((f) => f.id === 'child-folder')).toBeUndefined()
      // card should have been re-parented to parent-folder
      expect(result.current.cardsById['card-uuid'].folderId).toBe('parent-folder')
    })

    it('deleteFolder delete-contents mode deletes all descendant folders and their cards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('parent-folder')
        .mockReturnValueOnce('child-folder')
        .mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.createFolder({ name: 'Parent' }) })
      await act(async () => {
        await result.current.createFolder({ name: 'Child', parentId: 'parent-folder' })
      })
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.moveCardToFolder('card-uuid', 'child-folder') })

      await act(async () => { await result.current.deleteFolder('parent-folder', 'delete-contents') })

      expect(result.current.folders).toHaveLength(0)
      expect(result.current.cardsById['card-uuid']).toBeUndefined()
      const stored = await getAllCards()
      expect(stored.find((c) => c.id === 'card-uuid')).toBeUndefined()
    })

    it('moveFolder re-parents the folder', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('folder-a')
        .mockReturnValueOnce('folder-b')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.createFolder({ name: 'A' }) })
      await act(async () => { await result.current.createFolder({ name: 'B' }) })

      await act(async () => { await result.current.moveFolder('folder-a', 'folder-b') })

      expect(result.current.folders.find((f) => f.id === 'folder-a')?.parentId).toBe('folder-b')
    })

    it('moveFolder is a no-op when moving a folder into its own descendant', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('parent-folder')
        .mockReturnValueOnce('child-folder')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.createFolder({ name: 'Parent' }) })
      await act(async () => {
        await result.current.createFolder({ name: 'Child', parentId: 'parent-folder' })
      })

      // Moving parent into child would create a cycle
      await act(async () => { await result.current.moveFolder('parent-folder', 'child-folder') })

      expect(result.current.folders.find((f) => f.id === 'parent-folder')?.parentId).toBeNull()
    })
  })

  describe('stack actions', () => {
    describe('stackSelectedFlat', () => {
      it('creates a flat stack and removes selected cards from the tab', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => {
          await result.current.stackSelectedFlat(['card-a', 'card-b'])
        })

        expect(result.current.entries).toHaveLength(1)
        expect(result.current.entries[0].card.type).toBe('stack')
        expect(result.current.entries[0].card.config.memberIds).toEqual(['card-a', 'card-b'])
      })

      it('places the new stack at the first selected card position', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('card-c')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'C', body: '' }) })
        await act(async () => {
          await result.current.stackSelectedFlat(['card-b', 'card-c'])
        })

        // A stays, stack (from B+C) is at position 1
        expect(result.current.entries).toHaveLength(2)
        expect(result.current.entries[0].card.id).toBe('card-a')
        expect(result.current.entries[1].card.id).toBe('stack-uuid')
      })

      it('flattens a nested stack into the new flat stack', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('inner-stack')
          .mockReturnValueOnce('outer-stack')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        // Create an existing stack{b, c} in the tab
        await act(async () => { await result.current.createStack(['card-b', 'card-c']) })
        // Flat-merge card-a + inner-stack → should produce flat [b, c, a]? No: [a, b, c]
        await act(async () => {
          await result.current.stackSelectedFlat(['card-a', 'inner-stack'])
        })

        expect(result.current.entries).toHaveLength(1)
        const flat = result.current.entries[0].card.config.memberIds
        expect(flat).toContain('card-a')
        expect(flat).toContain('card-b')
        expect(flat).toContain('card-c')
        expect(flat).not.toContain('inner-stack')
      })

      it('is a no-op when fewer than 2 ids provided', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => {
          await result.current.stackSelectedFlat(['only-one'])
        })

        expect(result.current.entries).toHaveLength(0)
      })
    })

    describe('nestMoveCardInTarget', () => {
      it('creates a stack at the target position and removes both from the tab', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => {
          await result.current.nestMoveCardInTarget('card-a', 'card-b')
        })

        expect(result.current.entries).toHaveLength(1)
        expect(result.current.entries[0].card.type).toBe('stack')
        expect(result.current.entries[0].card.config.memberIds).toEqual(['card-b', 'card-a'])
        expect(result.current.entries[0].card.config.topCardId).toBe('card-b')
      })

      it('places the new stack at the target card position', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('card-c')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'C', body: '' }) })
        // Move A into B: stack replaces B at position 1, A removed from position 0
        await act(async () => {
          await result.current.nestMoveCardInTarget('card-a', 'card-b')
        })

        expect(result.current.entries).toHaveLength(2)
        expect(result.current.entries[0].card.id).toBe('stack-uuid')
        expect(result.current.entries[1].card.id).toBe('card-c')
      })

      it('adds moving card as a member when target is already a stack', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('existing-stack')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.createStack(['card-b', 'card-c']) })
        await act(async () => {
          await result.current.nestMoveCardInTarget('card-a', 'existing-stack')
        })

        // Only the stack remains in the tab (card-a removed from tab, added as member)
        expect(result.current.entries).toHaveLength(1)
        expect(result.current.entries[0].card.config.memberIds).toEqual(['card-b', 'card-c', 'card-a'])
      })

      it('allows a stack to be nested inside a regular card (stack-in-stack)', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('inner-stack')
          .mockReturnValueOnce('outer-stack')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.createStack(['card-b', 'card-c']) })
        // Nest inner-stack inside card-a
        await act(async () => {
          await result.current.nestMoveCardInTarget('inner-stack', 'card-a')
        })

        expect(result.current.entries).toHaveLength(1)
        const outer = result.current.entries[0].card
        expect(outer.config.memberIds).toEqual(['card-a', 'inner-stack'])
        // inner-stack is still in cardsById (it's nested, not deleted)
        expect(result.current.cardsById['inner-stack']).toBeDefined()
      })
    })

    describe('createStack', () => {
      it('creates a stack card and places it in the active tab', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => {
          await result.current.createStack(['card-a', 'card-b'])
        })

        expect(result.current.entries).toHaveLength(1)
        expect(result.current.entries[0].card.type).toBe('stack')
        expect(result.current.entries[0].card.config.memberIds).toEqual(['card-a', 'card-b'])
      })

      it('returns the stack id', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        let returnedId
        await act(async () => {
          returnedId = await result.current.createStack(['card-a', 'card-b'])
        })

        expect(returnedId).toBe('stack-uuid')
      })

      it('persists the stack to Dexie', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })

        const cards = await getAllCards()
        const stack = cards.find((c) => c.id === 'stack-uuid')
        expect(stack).toBeDefined()
        expect(stack.type).toBe('stack')
        expect(stack.config.memberIds).toEqual(['card-a', 'card-b'])
      })

      it('does not remove source cards from the tab', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => {
          await result.current.createStack(['card-a', 'card-b'])
        })

        // Source cards still in tab + stack = 3 entries
        expect(result.current.entries).toHaveLength(3)
      })

      it('is a no-op when memberIds has fewer than 2 entries', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        let returnedId
        await act(async () => {
          returnedId = await result.current.createStack(['only-one'])
        })

        expect(returnedId).toBeUndefined()
        expect(result.current.entries).toHaveLength(0)
      })

      it('inserts at insertPosition when provided', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('card-c')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'C', body: '' }) })

        await act(async () => {
          await result.current.createStack(['card-a', 'card-b'], { insertPosition: 1 })
        })

        // stack is at position 1 (0-indexed)
        expect(result.current.entries[1].card.id).toBe('stack-uuid')
      })

      it('appends to end when insertPosition not provided', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => {
          await result.current.createStack(['card-a', 'card-b'])
        })

        const lastEntry = result.current.entries[result.current.entries.length - 1]
        expect(lastEntry.card.id).toBe('stack-uuid')
      })
    })

    describe('addToStack', () => {
      it('adds cardId to the stack memberIds', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        await act(async () => { await result.current.addToStack('stack-uuid', 'card-c') })

        expect(result.current.cardsById['stack-uuid'].config.memberIds).toEqual(['card-a', 'card-b', 'card-c'])
      })

      it('persists the updated stack to Dexie', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        await act(async () => { await result.current.addToStack('stack-uuid', 'card-c') })

        const cards = await getAllCards()
        const stack = cards.find((c) => c.id === 'stack-uuid')
        expect(stack.config.memberIds).toEqual(['card-a', 'card-b', 'card-c'])
      })

      it('is a no-op when stackId is not found', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await expect(act(async () => {
          await result.current.addToStack('nonexistent', 'card-c')
        })).resolves.not.toThrow()
      })

      it('is a no-op when the card is not a stack type', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addToStack('card-uuid', 'card-c') })

        expect(result.current.cardsById['card-uuid'].type).toBe('text')
        expect(result.current.cardsById['card-uuid'].config).toBeNull()
      })
    })

    describe('removeFromStack', () => {
      it('removes cardId from stack memberIds when result has >= 2 members', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b', 'card-c']) })
        await act(async () => { await result.current.removeFromStack('stack-uuid', 'card-b') })

        expect(result.current.cardsById['stack-uuid'].config.memberIds).toEqual(['card-a', 'card-c'])
        expect(result.current.cardsById['stack-uuid']).toBeDefined()
      })

      it('dissolves the stack when result would have fewer than 2 members', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        // Pre-seed tab so init() uses the else branch (preserves cardsById from getAllCards)
        await db.tabs.put({
          id: 'tab-uuid', name: 'Main', kind: 'blank', order: 0,
          savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000,
        })
        await db.cards.put({
          id: 'card-a', type: 'text', title: 'A', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-b', type: 'text', title: 'B', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        expect(result.current.entries).toHaveLength(1)
        expect(result.current.entries[0].card.type).toBe('stack')

        await act(async () => { await result.current.removeFromStack('stack-uuid', 'card-b') })

        // Stack dissolved — stack card gone, members inserted
        expect(result.current.cardsById['stack-uuid']).toBeUndefined()
        const entryIds = result.current.entries.map((e) => e.card.id)
        expect(entryIds).toContain('card-a')
        expect(entryIds).toContain('card-b')
      })

      it('is a no-op when stackId is not found', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await expect(act(async () => {
          await result.current.removeFromStack('nonexistent', 'card-a')
        })).resolves.not.toThrow()
      })
    })

    describe('dissolveStack', () => {
      it('removes the stack from the active tab', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        await db.cards.put({
          id: 'card-a', type: 'text', title: 'A', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-b', type: 'text', title: 'B', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        expect(result.current.entries[0].card.type).toBe('stack')

        await act(async () => { await result.current.dissolveStack('stack-uuid') })

        const entryIds = result.current.entries.map((e) => e.card.id)
        expect(entryIds).not.toContain('stack-uuid')
      })

      it('inserts member cards at the stack position', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('card-x')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        // Pre-seed tab so init() uses the else branch (preserves cardsById from getAllCards)
        await db.tabs.put({
          id: 'tab-uuid', name: 'Main', kind: 'blank', order: 0,
          savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000,
        })
        await db.cards.put({
          id: 'card-a', type: 'text', title: 'A', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-b', type: 'text', title: 'B', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        // Tab: [card-x, stack]
        await act(async () => { await result.current.addCard({ title: 'X', body: '' }) })
        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        expect(result.current.entries).toHaveLength(2)

        await act(async () => { await result.current.dissolveStack('stack-uuid') })

        // Stack (at position 1) dissolves → card-a and card-b inserted at position 1
        expect(result.current.entries).toHaveLength(3)
        expect(result.current.entries[0].card.id).toBe('card-x')
        expect(result.current.entries[1].card.id).toBe('card-a')
        expect(result.current.entries[2].card.id).toBe('card-b')
      })

      it('deletes the stack card from Dexie when location is none', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        await db.cards.put({
          id: 'card-a', type: 'text', title: 'A', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-b', type: 'text', title: 'B', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        await act(async () => { await result.current.dissolveStack('stack-uuid') })

        const cards = await getAllCards()
        expect(cards.find((c) => c.id === 'stack-uuid')).toBeUndefined()
      })

      it('does not delete the stack card when location is shelf', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        // Seed a stack with location shelf directly
        await db.cards.put({
          id: 'stack-uuid', type: 'stack', title: '', body: '', back: '',
          config: { memberIds: ['card-a', 'card-b'], topCardId: 'card-a' },
          location: 'shelf', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-a', type: 'text', title: 'A', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-b', type: 'text', title: 'B', body: '', back: '', config: null,
          location: 'none', folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.tab_cards.put({ tabId: 'tab-uuid', cardId: 'stack-uuid', position: 0, foldState: false, hiddenState: false })
        await db.tabs.put({
          id: 'tab-uuid', name: 'Main', kind: 'blank', order: 0,
          savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000,
        })

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.dissolveStack('stack-uuid') })

        const cards = await getAllCards()
        expect(cards.find((c) => c.id === 'stack-uuid')).toBeDefined()
        expect(result.current.shelfEntries.find((c) => c.id === 'stack-uuid')).toBeDefined()
      })

      it('is a no-op when stackId not found', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await expect(act(async () => {
          await result.current.dissolveStack('nonexistent')
        })).resolves.not.toThrow()
      })
    })

    describe('setStackTopCard', () => {
      it('sets topCardId on the stack', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        await act(async () => { await result.current.setStackTopCard('stack-uuid', 'card-b') })

        expect(result.current.cardsById['stack-uuid'].config.topCardId).toBe('card-b')
      })

      it('persists the updated topCardId to Dexie', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        await act(async () => { await result.current.setStackTopCard('stack-uuid', 'card-b') })

        const cards = await getAllCards()
        expect(cards.find((c) => c.id === 'stack-uuid')?.config.topCardId).toBe('card-b')
      })

      it('is a no-op when cardId is not in memberIds', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b']) })
        const topBefore = result.current.cardsById['stack-uuid'].config.topCardId

        await act(async () => { await result.current.setStackTopCard('stack-uuid', 'card-z') })

        expect(result.current.cardsById['stack-uuid'].config.topCardId).toBe(topBefore)
      })

      it('is a no-op when stackId not found', async () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await expect(act(async () => {
          await result.current.setStackTopCard('nonexistent', 'card-a')
        })).resolves.not.toThrow()
      })
    })

    describe('reorderStackMembers', () => {
      it('reorders memberIds within the stack', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b', 'card-c']) })
        await act(async () => { await result.current.reorderStackMembers('stack-uuid', 0, 2) })

        expect(result.current.cardsById['stack-uuid'].config.memberIds).toEqual(['card-b', 'card-c', 'card-a'])
      })

      it('is a no-op when fromIndex equals toIndex', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b', 'card-c']) })
        const stackBefore = result.current.cardsById['stack-uuid']

        await act(async () => { await result.current.reorderStackMembers('stack-uuid', 1, 1) })

        expect(result.current.cardsById['stack-uuid'].config.memberIds).toEqual(stackBefore.config.memberIds)
      })

      it('persists reordered memberIds to Dexie', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.createStack(['card-a', 'card-b', 'card-c']) })
        await act(async () => { await result.current.reorderStackMembers('stack-uuid', 2, 0) })

        const cards = await getAllCards()
        expect(cards.find((c) => c.id === 'stack-uuid')?.config.memberIds).toEqual(['card-c', 'card-a', 'card-b'])
      })
    })

    describe('convertTabToStack', () => {
      it('creates a stack with location shelf from the active tab card order', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => { await result.current.convertTabToStack() })

        const stack = result.current.cardsById['stack-uuid']
        expect(stack).toBeDefined()
        expect(stack.type).toBe('stack')
        expect(stack.location).toBe('shelf')
        expect(stack.config.memberIds).toEqual(['card-a', 'card-b'])
      })

      it('does not modify the tab card order', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => { await result.current.convertTabToStack() })

        // Tab still has the same 2 cards
        expect(result.current.entries).toHaveLength(2)
        expect(result.current.entries[0].card.id).toBe('card-a')
        expect(result.current.entries[1].card.id).toBe('card-b')
      })

      it('returns the stack id', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })

        let returnedId
        await act(async () => {
          returnedId = await result.current.convertTabToStack()
        })

        expect(returnedId).toBe('stack-uuid')
      })

      it('is a no-op when the tab has fewer than 2 cards', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

        let returnedId
        await act(async () => {
          returnedId = await result.current.convertTabToStack()
        })

        expect(returnedId).toBeUndefined()
        expect(result.current.shelfEntries.filter((c) => c.type === 'stack')).toHaveLength(0)
      })

      it('stack appears in shelfEntries', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
          .mockReturnValueOnce('stack-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))

        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })
        await act(async () => { await result.current.convertTabToStack() })

        expect(result.current.shelfEntries.find((c) => c.id === 'stack-uuid')).toBeDefined()
      })
    })
  })

  describe('multi-select', () => {
    it('selectedCardIds starts as an empty Set', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.selectedCardIds.size).toBe(0)
    })

    describe('toggleCardSelection', () => {
      it('adds cardId to selectedCardIds when not present', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))
        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

        act(() => { result.current.toggleCardSelection('card-uuid') })

        expect(result.current.selectedCardIds.has('card-uuid')).toBe(true)
      })

      it('removes cardId from selectedCardIds when already present', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))
        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

        act(() => { result.current.toggleCardSelection('card-uuid') })
        expect(result.current.selectedCardIds.has('card-uuid')).toBe(true)

        act(() => { result.current.toggleCardSelection('card-uuid') })
        expect(result.current.selectedCardIds.has('card-uuid')).toBe(false)
      })

      it('multiple cards can be selected simultaneously', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))
        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })

        act(() => { result.current.toggleCardSelection('card-a') })
        act(() => { result.current.toggleCardSelection('card-b') })

        expect(result.current.selectedCardIds.has('card-a')).toBe(true)
        expect(result.current.selectedCardIds.has('card-b')).toBe(true)
        expect(result.current.selectedCardIds.size).toBe(2)
      })
    })

    describe('clearSelection', () => {
      it('empties selectedCardIds', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-uuid')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))
        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

        act(() => { result.current.toggleCardSelection('card-uuid') })
        expect(result.current.selectedCardIds.size).toBe(1)

        act(() => { result.current.clearSelection() })
        expect(result.current.selectedCardIds.size).toBe(0)
      })
    })

    describe('selectAll', () => {
      it('adds all active tab card IDs to selectedCardIds', async () => {
        vi.spyOn(crypto, 'randomUUID')
          .mockReturnValueOnce('tab-uuid')
          .mockReturnValueOnce('card-a')
          .mockReturnValueOnce('card-b')
        vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))
        await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
        await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })

        act(() => { result.current.selectAll() })

        expect(result.current.selectedCardIds.has('card-a')).toBe(true)
        expect(result.current.selectedCardIds.has('card-b')).toBe(true)
        expect(result.current.selectedCardIds.size).toBe(2)
      })

      it('does not include cards from other tabs', async () => {
        await db.tabs.put({
          id: 'tab-a', name: 'A', kind: 'blank', order: 0,
          savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000,
        })
        await db.tabs.put({
          id: 'tab-b', name: 'B', kind: 'blank', order: 1,
          savedLocation: 'none', savedFolderId: null, createdAt: 1_000, updatedAt: 1_000,
        })
        await db.cards.put({
          id: 'card-in-a', type: 'text', title: 'A', body: '', location: 'none',
          folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.cards.put({
          id: 'card-in-b', type: 'text', title: 'B', body: '', location: 'none',
          folderId: null, createdAt: 1_000, updatedAt: 1_000, dirty: false,
        })
        await db.tab_cards.put({ tabId: 'tab-a', cardId: 'card-in-a', position: 0, foldState: false, hiddenState: false })
        await db.tab_cards.put({ tabId: 'tab-b', cardId: 'card-in-b', position: 0, foldState: false, hiddenState: false })

        const { result } = renderHook(() => useTabs())
        await waitFor(() => expect(result.current.isReady).toBe(true))
        expect(result.current.activeTabId).toBe('tab-a')

        act(() => { result.current.selectAll() })

        expect(result.current.selectedCardIds.has('card-in-a')).toBe(true)
        expect(result.current.selectedCardIds.has('card-in-b')).toBe(false)
        expect(result.current.selectedCardIds.size).toBe(1)
      })
    })
  })

  describe('bulk operations', () => {
    it('bulkMoveCards updates folderId for all specified cards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-a')
        .mockReturnValueOnce('card-b')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })

      await act(async () => {
        await result.current.bulkMoveCards(['card-a', 'card-b'], 'folder-1')
      })

      expect(result.current.cardsById['card-a'].folderId).toBe('folder-1')
      expect(result.current.cardsById['card-b'].folderId).toBe('folder-1')
    })

    it('bulkDeleteCards removes all specified cards from state and storage', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-uuid')
        .mockReturnValueOnce('card-a')
        .mockReturnValueOnce('card-b')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })
      await act(async () => { await result.current.addCard({ title: 'B', body: '' }) })

      await act(async () => { await result.current.bulkDeleteCards(['card-a', 'card-b']) })

      expect(result.current.cardsById['card-a']).toBeUndefined()
      expect(result.current.cardsById['card-b']).toBeUndefined()
      expect(result.current.entries).toHaveLength(0)
      const stored = await getAllCards()
      expect(stored.find((c) => c.id === 'card-a')).toBeUndefined()
    })

    it('bulkMoveTabs updates savedFolderId for all specified tabs', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValue('tab-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
      syncMocks.createCardSyncScheduler.mockReturnValue({
        scheduleSync: syncMocks.scheduleSync,
        runNow: syncMocks.runNow,
      })

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.saveTabToShelf('tab-uuid') })

      tabStorageMocks.upsertSavedTab.mockClear()
      await act(async () => { await result.current.bulkMoveTabs(['tab-uuid'], 'folder-1') })

      expect(result.current.tabs.find((t) => t.id === 'tab-uuid')?.savedFolderId).toBe('folder-1')
      expect(result.current.tabs.find((t) => t.id === 'tab-uuid')?.savedLocation).toBe('library')
      expect(tabStorageMocks.upsertSavedTab).toHaveBeenCalledOnce()
    })
  })
})
