import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAllCards } from '../card/cardStorage'
import { db } from '../db/vaultDb'
import { getAllTabCards } from './tabStorage'
import { useDock } from './useDock'

beforeEach(async () => {
  await db.dock_cards.clear()
  await db.cards.clear()
  await db.tab_cards.clear()
  vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-card-uuid')
  vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useDock', () => {
  it('loads dockCardIds from Dexie on mount', async () => {
    await db.dock_cards.put({ cardId: 'existing-card', order: 0 })
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toContain('existing-card'))
  })

  it('addToDock persists to Dexie and updates dockCardIds', async () => {
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toEqual([]))

    await act(async () => {
      await result.current.addToDock('card-1')
    })

    expect(result.current.dockCardIds).toContain('card-1')
    const records = await db.dock_cards.toArray()
    expect(records.some((r) => r.cardId === 'card-1')).toBe(true)
  })

  it('removeFromDock removes from Dexie and dockCardIds', async () => {
    await db.dock_cards.put({ cardId: 'card-1', order: 0 })
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toContain('card-1'))

    await act(async () => {
      await result.current.removeFromDock('card-1')
    })

    expect(result.current.dockCardIds).not.toContain('card-1')
    expect(await db.dock_cards.toArray()).toEqual([])
  })

  it('removeFromDock clears activeDockCardId if it matches the removed card', async () => {
    await db.dock_cards.put({ cardId: 'card-1', order: 0 })
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toContain('card-1'))

    act(() => { result.current.openDockCard('card-1') })
    expect(result.current.activeDockCardId).toBe('card-1')

    await act(async () => {
      await result.current.removeFromDock('card-1')
    })

    expect(result.current.activeDockCardId).toBeNull()
  })

  it('createAndPinCard creates card in Dexie, adds to dock, opens panel; no tab_card created', async () => {
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toEqual([]))

    await act(async () => {
      await result.current.createAndPinCard()
    })

    const cards = await getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].id).toBe('test-card-uuid')

    expect(result.current.dockCardIds).toContain('test-card-uuid')
    expect(result.current.activeDockCardId).toBe('test-card-uuid')
    expect(await getAllTabCards()).toHaveLength(0)
  })

  it('createAndPinCard calls onCreated with the new card', async () => {
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toEqual([]))

    const onCreated = vi.fn()
    await act(async () => {
      await result.current.createAndPinCard(onCreated)
    })

    expect(onCreated).toHaveBeenCalledOnce()
    expect(onCreated.mock.calls[0][0]).toMatchObject({ id: 'test-card-uuid', title: '', body: '' })
  })

  it('moveDockCardToTab calls addTabCard and removeFromDock', async () => {
    await db.dock_cards.put({ cardId: 'card-1', order: 0 })
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toContain('card-1'))

    const addTabCard = vi.fn().mockResolvedValue(undefined)
    await act(async () => {
      await result.current.moveDockCardToTab('card-1', addTabCard)
    })

    expect(addTabCard).toHaveBeenCalledWith('card-1')
    expect(result.current.dockCardIds).not.toContain('card-1')
  })

  it('moveDockCardToTab skips addTabCard if card already has tab_card in active tab', async () => {
    await db.dock_cards.put({ cardId: 'card-1', order: 0 })
    await db.tab_cards.put({ tabId: 'tab-1', cardId: 'card-1', position: 0, foldState: false, hiddenState: false })
    const { result } = renderHook(() => useDock({}))
    await waitFor(() => expect(result.current.dockCardIds).toContain('card-1'))

    const addTabCard = vi.fn().mockResolvedValue(undefined)
    await act(async () => {
      await result.current.moveDockCardToTab('card-1', addTabCard)
    })

    expect(addTabCard).not.toHaveBeenCalled()
    expect(result.current.dockCardIds).not.toContain('card-1')
  })

  it('dockCardEntries filters out missing cards (cardsById does not have the id)', async () => {
    await db.dock_cards.put({ cardId: 'card-a', order: 0 })
    await db.dock_cards.put({ cardId: 'card-b', order: 1 })

    const cardsById = { 'card-b': { id: 'card-b', title: 'B', body: '' } }
    const { result } = renderHook(() => useDock({ cardsById }))
    await waitFor(() => expect(result.current.dockCardIds).toHaveLength(2))

    expect(result.current.dockCardEntries).toHaveLength(1)
    expect(result.current.dockCardEntries[0].cardId).toBe('card-b')
  })
})
