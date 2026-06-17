import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loadTabCards, loadTabs } from './tabStorage'
import { useTabs } from './useTabs'

describe('useTabs', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('default-tab-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates and persists a default tab on first mount', () => {
    const { result } = renderHook(() => useTabs())
    expect(result.current.tab.name).toBe('Main')
    expect(loadTabs()).toHaveLength(1)
    expect(loadTabs()[0].id).toBe('default-tab-uuid')
  })

  it('loads an existing tab and its cards on mount', () => {
    localStorage.setItem(
      'olive12:tabs',
      JSON.stringify([
        {
          id: 'stored-tab',
          name: 'Stored',
          kind: 'blank',
          order: 0,
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_000_000,
        },
      ]),
    )
    localStorage.setItem(
      'olive12:cards',
      JSON.stringify([
        {
          id: 'stored-card',
          type: 'text',
          title: 'Hello',
          body: 'World',
          createdAt: 1_700_000_000_000,
          updatedAt: 1_700_000_000_000,
        },
      ]),
    )
    localStorage.setItem(
      'olive12:tab_cards',
      JSON.stringify([
        {
          tabId: 'stored-tab',
          cardId: 'stored-card',
          position: 0,
          foldState: false,
          hiddenState: false,
        },
      ]),
    )

    const { result } = renderHook(() => useTabs())

    expect(result.current.tab.id).toBe('stored-tab')
    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.title).toBe('Hello')
  })

  it('addCard appends a card to entries and persists', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'Notes', body: 'Buy milk' })
    })

    expect(result.current.entries).toHaveLength(1)
    expect(result.current.entries[0].card.title).toBe('Notes')
    expect(result.current.entries[0].position).toBe(0)
    expect(loadTabCards()).toHaveLength(1)
    expect(loadTabCards()[0].cardId).toBe('card-uuid')
  })

  it('addCard appends at next position', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-a')
      .mockReturnValueOnce('card-b')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'First', body: '' })
      result.current.addCard({ title: 'Second', body: '' })
    })

    expect(result.current.entries[0].position).toBe(0)
    expect(result.current.entries[1].position).toBe(1)
  })

  it('reorder changes card positions', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-a')
      .mockReturnValueOnce('card-b')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'A', body: '' })
      result.current.addCard({ title: 'B', body: '' })
    })

    act(() => {
      result.current.reorder('card-a', 1)
    })

    expect(result.current.entries[0].card.id).toBe('card-b')
    expect(result.current.entries[1].card.id).toBe('card-a')
  })

  it('fold sets foldState to true', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'A', body: '' })
    })

    act(() => {
      result.current.fold('card-uuid')
    })

    expect(result.current.entries[0].foldState).toBe(true)
  })

  it('unfold sets foldState to false', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'A', body: '' })
    })
    act(() => {
      result.current.fold('card-uuid')
    })
    act(() => {
      result.current.unfold('card-uuid')
    })

    expect(result.current.entries[0].foldState).toBe(false)
  })

  it('hide sets hiddenState to true', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'A', body: '' })
    })
    act(() => {
      result.current.hide('card-uuid')
    })

    expect(result.current.entries[0].hiddenState).toBe(true)
  })

  it('unhide sets hiddenState to false', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'A', body: '' })
    })
    act(() => {
      result.current.hide('card-uuid')
    })
    act(() => {
      result.current.unhide('card-uuid')
    })

    expect(result.current.entries[0].hiddenState).toBe(false)
  })

  it('remount reloads persisted state', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'Persist', body: 'After reload' })
    })

    unmount()

    const { result: reloaded } = renderHook(() => useTabs())

    expect(reloaded.current.entries).toHaveLength(1)
    expect(reloaded.current.entries[0].card.title).toBe('Persist')
    expect(reloaded.current.entries[0].foldState).toBe(false)
    expect(reloaded.current.entries[0].hiddenState).toBe(false)
  })

  it('remount preserves fold state', () => {
    vi.restoreAllMocks()
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('tab-uuid')
      .mockReturnValueOnce('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

    const { result, unmount } = renderHook(() => useTabs())

    act(() => {
      result.current.addCard({ title: 'A', body: '' })
    })
    act(() => {
      result.current.fold('card-uuid')
    })

    unmount()

    const { result: reloaded } = renderHook(() => useTabs())
    expect(reloaded.current.entries[0].foldState).toBe(true)
  })
})
