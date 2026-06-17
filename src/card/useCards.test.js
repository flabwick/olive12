import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadCards } from './cardStorage'
import { useCards } from './useCards'

describe('useCards', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('loads cards from storage on mount', () => {
    const stored = [
      {
        id: 'stored-uuid',
        type: 'text',
        title: 'Saved',
        body: 'From storage',
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      },
    ]
    localStorage.setItem('olive12:cards', JSON.stringify(stored))

    const { result } = renderHook(() => useCards())

    expect(result.current.cards).toEqual(stored)
  })

  it('addCard appends to state and persists', () => {
    const { result } = renderHook(() => useCards())

    act(() => {
      result.current.addCard({ title: 'Notes', body: 'Buy milk' })
    })

    expect(result.current.cards).toEqual([
      {
        id: 'test-uuid',
        type: 'text',
        title: 'Notes',
        body: 'Buy milk',
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      },
    ])
    expect(loadCards()).toEqual(result.current.cards)
  })

  it('reloads persisted cards after remount', () => {
    const { result, unmount } = renderHook(() => useCards())

    act(() => {
      result.current.addCard({ title: 'Persist', body: 'After refresh' })
    })

    unmount()

    const { result: reloaded } = renderHook(() => useCards())

    expect(reloaded.current.cards).toEqual([
      {
        id: 'test-uuid',
        type: 'text',
        title: 'Persist',
        body: 'After refresh',
        createdAt: 1_700_000_000_000,
        updatedAt: 1_700_000_000_000,
      },
    ])
  })
})
