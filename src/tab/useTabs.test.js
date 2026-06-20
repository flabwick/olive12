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
const deleteRemoteMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))
const tabStorageMock = vi.hoisted(() => ({
  fetchSavedTabsForUser: vi.fn().mockResolvedValue([]),
  upsertSavedTab: vi.fn().mockResolvedValue(undefined),
  deleteSavedTab: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../lib/supabaseClient', () => ({
  supabase: { functions: { invoke: invokeMock } },
}))
vi.mock('../sync/cardSupabaseStorage', () => ({
  makeCardSupabaseStorage: vi.fn(() => ({ deleteRemoteCard: deleteRemoteMock })),
}))
vi.mock('../sync/cardSync', () => ({
  createCardSyncScheduler: syncMocks.createCardSyncScheduler,
  syncDirtyCardsForUser: vi.fn(),
}))
vi.mock('../tab/tabSupabaseStorage', () => ({
  makeTabSupabaseStorage: vi.fn(() => tabStorageMock),
}))

describe('useTabs', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
    await db.folders.clear()
    await db.links.clear()
    await db.index_entries.clear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and persists a default tab on first mount', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('default-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    expect(result.current.tab.name).toBe('')
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

  it('moveToLibrary calls wiki-index and stores the index entry', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    invokeMock.mockResolvedValue({
      data: { title: 'Indexed A', tags: ['note'], summary: 'Summary text.', links: [] },
      error: null,
    })

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))
    await act(async () => { await result.current.addCard({ title: 'A', body: 'Body content' }) })
    await act(async () => { await result.current.moveToLibrary('card-uuid') })

    expect(invokeMock).toHaveBeenCalledWith('wiki-index', expect.objectContaining({
      body: expect.objectContaining({
        card: expect.objectContaining({ id: 'card-uuid', location: 'library' }),
      }),
    }))
    expect(result.current.getIndexEntry('card-uuid')).toMatchObject({
      title: 'Indexed A',
      summary: 'Summary text.',
    })
  })

  it('flipCard triggers wiki-index for library card missing an index entry', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    invokeMock.mockResolvedValue({
      data: { title: 'On flip', tags: [], summary: 'Generated on flip.', links: [] },
      error: null,
    })

    await db.cards.put({
      id: 'card-uuid', type: 'text', title: 'Lib card', body: 'Content',
      location: 'library', createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
    })
    await db.tabs.put({
      id: 'seed-tab', name: 'Main', kind: 'blank', order: 0,
      savedLocation: 'none', savedFolderId: null,
      createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
    })
    await db.tab_cards.put({
      tabId: 'seed-tab', cardId: 'card-uuid', position: 0,
      foldState: false, hiddenState: false,
    })

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    act(() => { result.current.flipCard('card-uuid') })
    await waitFor(() => {
      expect(result.current.getIndexEntry('card-uuid')?.summary).toBe('Generated on flip.')
    })
  })

  it('flipCard does not invoke wiki-index for shelf cards', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    await db.cards.put({
      id: 'card-uuid', type: 'text', title: 'Shelf card', body: 'Content',
      location: 'shelf', createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
    })
    await db.tabs.put({
      id: 'seed-tab', name: 'Main', kind: 'blank', order: 0,
      savedLocation: 'none', savedFolderId: null,
      createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
    })
    await db.tab_cards.put({
      tabId: 'seed-tab', cardId: 'card-uuid', position: 0,
      foldState: false, hiddenState: false,
    })

    const { result } = renderHook(() => useTabs())
    await waitFor(() => expect(result.current.isReady).toBe(true))

    invokeMock.mockClear()
    act(() => { result.current.flipCard('card-uuid') })

    expect(invokeMock).not.toHaveBeenCalled()
    expect(result.current.getIndexEntry('card-uuid')).toBeUndefined()
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
      tabStorageMock.fetchSavedTabsForUser.mockClear()
      tabStorageMock.upsertSavedTab.mockClear()
      tabStorageMock.deleteSavedTab.mockClear()
      tabStorageMock.fetchSavedTabsForUser.mockResolvedValue([])
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

    it('saveTabToShelf pushes the tab to Supabase when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      tabStorageMock.upsertSavedTab.mockClear()
      await act(async () => { await result.current.saveTabToShelf('tab-1') })

      expect(tabStorageMock.upsertSavedTab).toHaveBeenCalledOnce()
      const row = tabStorageMock.upsertSavedTab.mock.calls[0][0]
      expect(row.id).toBe('tab-1')
      expect(row.user_id).toBe('user-1')
      expect(row.saved_location).toBe('shelf')
    })

    it('saveTabToShelf does not push to Supabase when userId is absent', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      expect(tabStorageMock.upsertSavedTab).not.toHaveBeenCalled()
    })

    it('moveTabToLibrary pushes the tab to Supabase when userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      tabStorageMock.upsertSavedTab.mockClear()
      await act(async () => { await result.current.moveTabToLibrary('tab-1', null) })

      expect(tabStorageMock.upsertSavedTab).toHaveBeenCalledOnce()
      const row = tabStorageMock.upsertSavedTab.mock.calls[0][0]
      expect(row.saved_location).toBe('library')
    })

    it('renameTab pushes to Supabase when tab is saved and userId is provided', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      tabStorageMock.upsertSavedTab.mockClear()

      await act(async () => { await result.current.renameTab('tab-1', 'My Research') })
      expect(tabStorageMock.upsertSavedTab).toHaveBeenCalledOnce()
      expect(tabStorageMock.upsertSavedTab.mock.calls[0][0].name).toBe('My Research')
    })

    it('renameTab does not push to Supabase when tab is unsaved', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      tabStorageMock.upsertSavedTab.mockClear()
      await act(async () => { await result.current.renameTab('tab-1', 'Work') })
      expect(tabStorageMock.upsertSavedTab).not.toHaveBeenCalled()
    })

    it('removeTab on a saved tab does not call deleteSavedTab', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-fallback')

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))

      await act(async () => { await result.current.saveTabToShelf('tab-1') })
      await act(async () => { await result.current.removeTab('tab-1') })

      expect(tabStorageMock.deleteSavedTab).not.toHaveBeenCalled()
    })

    it('init reconcile creates a local tab from a remote saved tab', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-local')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const remoteTab = {
        id: 'tab-remote',
        name: 'Remote Research',
        saved_location: 'shelf',
        saved_folder_id: null,
        card_ids: [],
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
      }
      tabStorageMock.fetchSavedTabsForUser.mockResolvedValue([remoteTab])

      const { result } = renderHook(() => useTabs({ userId: 'user-1' }))
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await waitFor(() => expect(result.current.tabs.some((t) => t.id === 'tab-remote')).toBe(true))

      const remoteLocal = result.current.tabs.find((t) => t.id === 'tab-remote')
      expect(remoteLocal.name).toBe('Remote Research')
      expect(remoteLocal.savedLocation).toBe('shelf')
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

  describe('brainFeedItems', () => {
    it('brainFeedItems is empty when no cards are in the index', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      expect(result.current.brainFeedItems).toEqual([])
    })

    it('stale card appears in brainFeedItems when contentHash differs', async () => {
      await db.tabs.put({
        id: 'seed-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.cards.put({
        id: 'lib-card', type: 'text', title: 'Stale note', body: 'old',
        location: 'library', contentHash: 'hash-current',
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.index_entries.put({
        cardId: 'lib-card', title: 'Stale note', tags: [], summary: '',
        links: [], contentHash: 'hash-old', updatedAt: 1_700_000_000_000,
      })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.brainFeedItems).toHaveLength(1)
      expect(result.current.brainFeedItems[0]).toMatchObject({ cardId: 'lib-card', reason: 'stale' })
    })

    it('non-stale card with matching contentHash is excluded from brainFeedItems', async () => {
      await db.tabs.put({
        id: 'seed-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.cards.put({
        id: 'lib-card', type: 'text', title: 'Current note', body: 'body',
        location: 'library', contentHash: 'hash-same',
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.index_entries.put({
        cardId: 'lib-card', title: 'Current note', tags: [], summary: '',
        links: [], contentHash: 'hash-same', updatedAt: 1_700_000_000_000,
      })
      await db.links.put({ sourceCardId: 'lib-card', targetCardId: 'other', linkType: 'embed', createdAt: 1 })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))

      expect(result.current.brainFeedItems).toEqual([])
    })

    it('dismissBrainItem removes the item from brainFeedItems', async () => {
      await db.tabs.put({
        id: 'seed-tab', name: 'Main', kind: 'blank', order: 0,
        savedLocation: 'none', savedFolderId: null,
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.cards.put({
        id: 'lib-card', type: 'text', title: 'Stale note', body: 'old',
        location: 'library', contentHash: 'hash-current',
        createdAt: 1_700_000_000_000, updatedAt: 1_700_000_000_000,
      })
      await db.index_entries.put({
        cardId: 'lib-card', title: 'Stale note', tags: [], summary: '',
        links: [], contentHash: 'hash-old', updatedAt: 1_700_000_000_000,
      })

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      expect(result.current.brainFeedItems).toHaveLength(1)

      await act(async () => { result.current.onBrainDismiss('lib-card') })

      expect(result.current.brainFeedItems).toHaveLength(0)
    })
  })

  describe('flip state', () => {
    it('isFlipped returns false for a card that has not been flipped', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      expect(result.current.isFlipped('card-uuid')).toBe(false)
    })

    it('flipCard toggles isFlipped to true', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      act(() => { result.current.flipCard('card-uuid') })
      expect(result.current.isFlipped('card-uuid')).toBe(true)
    })

    it('flipping the same card twice returns to false', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('tab-uuid').mockReturnValueOnce('card-uuid')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { result } = renderHook(() => useTabs())
      await waitFor(() => expect(result.current.isReady).toBe(true))
      await act(async () => { await result.current.addCard({ title: 'A', body: '' }) })

      act(() => { result.current.flipCard('card-uuid') })
      act(() => { result.current.flipCard('card-uuid') })
      expect(result.current.isFlipped('card-uuid')).toBe(false)
    })
  })
})
