import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { getAllCards } from './cardStorage'
import { useCards } from './useCards'

describe('useCards', () => {
  beforeEach(async () => {
    await db.cards.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads cards from storage on mount', async () => {
    await db.cards.put({
      id: 'stored-uuid',
      type: 'text',
      title: 'Saved',
      body: 'From storage',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })

    const { result } = renderHook(() => useCards())
    await waitFor(() => expect(result.current.cards).toHaveLength(1))

    expect(result.current.cards[0]).toMatchObject({ id: 'stored-uuid', title: 'Saved' })
  })

  it('addCard appends to state and persists', async () => {
    const { result } = renderHook(() => useCards())

    await act(async () => {
      await result.current.addCard({ title: 'Notes', body: 'Buy milk' })
    })

    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0]).toMatchObject({
      id: 'test-uuid',
      type: 'text',
      title: 'Notes',
      body: 'Buy milk',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
    const persisted = await getAllCards()
    expect(persisted).toHaveLength(1)
    expect(persisted[0]).toMatchObject({ id: 'test-uuid', title: 'Notes' })
  })

  it('reloads persisted cards after remount', async () => {
    const { result, unmount } = renderHook(() => useCards())

    await act(async () => {
      await result.current.addCard({ title: 'Persist', body: 'After refresh' })
    })

    unmount()

    const { result: reloaded } = renderHook(() => useCards())
    await waitFor(() => expect(reloaded.current.cards).toHaveLength(1))

    expect(reloaded.current.cards[0]).toMatchObject({
      id: 'test-uuid',
      title: 'Persist',
      body: 'After refresh',
    })
  })
})
