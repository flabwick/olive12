import { renderHook, act } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useBodyResize } from './useBodyResize'

function createPointerEvent(type, { pointerId = 1, clientX = 0, clientY = 0, pointerType = 'mouse', button = 0 } = {}) {
  return {
    type,
    pointerId,
    clientX,
    clientY,
    pointerType,
    button,
    preventDefault: vi.fn(),
    currentTarget: null,
  }
}

function setupResizeHook(options = {}) {
  const area = document.createElement('div')
  Object.defineProperty(area, 'offsetHeight', { value: 100, configurable: true })
  Object.defineProperty(area, 'scrollHeight', { value: 200, configurable: true })
  const areaRef = { current: area }
  const setBodyHeight = vi.fn()
  const handle = {
    setPointerCapture: vi.fn(),
    releasePointerCapture: vi.fn(),
    classList: {
      add: vi.fn(),
      remove: vi.fn(),
    },
  }

  const docHandlers = {}
  const addSpy = vi.spyOn(document, 'addEventListener').mockImplementation((type, listener) => {
    docHandlers[type] = listener
  })
  vi.spyOn(document, 'removeEventListener').mockImplementation(() => {})

  const { result } = renderHook(() =>
    useBodyResize({
      areaRef,
      setBodyHeight,
      minHeight: 40,
      allowExpandToContent: false,
      ...options,
    }),
  )

  return { result, area, areaRef, setBodyHeight, handle, docHandlers, addSpy }
}

describe('useBodyResize', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('starts resizing immediately on mouse pointerdown', () => {
    const { result, handle } = setupResizeHook()
    const down = createPointerEvent('pointerdown', { clientY: 50, pointerType: 'mouse' })
    down.currentTarget = handle

    act(() => {
      result.current.onPointerDown(down)
    })

    expect(down.preventDefault).toHaveBeenCalled()
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1)
    expect(handle.classList.add).toHaveBeenCalledWith('resize-handle--active')
    expect(result.current.isResizingRef.current).toBe(true)
  })

  it('waits for long press on touch before capturing', () => {
    vi.useFakeTimers()
    const { result, handle } = setupResizeHook()
    const down = createPointerEvent('pointerdown', { clientY: 50, pointerType: 'touch' })
    down.currentTarget = handle

    act(() => {
      result.current.onPointerDown(down)
    })

    expect(handle.setPointerCapture).not.toHaveBeenCalled()
    expect(handle.classList.add).toHaveBeenCalledWith('resize-handle--arming')
    expect(result.current.isResizingRef.current).toBe(false)

    act(() => {
      vi.advanceTimersByTime(180)
    })

    expect(handle.setPointerCapture).toHaveBeenCalledWith(1)
    expect(handle.classList.add).toHaveBeenCalledWith('resize-handle--active')
    expect(result.current.isResizingRef.current).toBe(true)
    vi.useRealTimers()
  })

  it('cancels touch long press when finger moves before timer', () => {
    vi.useFakeTimers()
    const { result, handle, docHandlers } = setupResizeHook()
    const down = createPointerEvent('pointerdown', { clientY: 50, pointerType: 'touch' })
    down.currentTarget = handle

    act(() => {
      result.current.onPointerDown(down)
    })

    const move = createPointerEvent('pointermove', { clientY: 70, pointerType: 'touch' })
    act(() => {
      docHandlers.pointermove(move)
    })

    act(() => {
      vi.advanceTimersByTime(180)
    })

    expect(handle.setPointerCapture).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  it('updates height on pointermove after resize starts', () => {
    const { result, handle, setBodyHeight, docHandlers } = setupResizeHook()
    const down = createPointerEvent('pointerdown', { clientY: 50, pointerType: 'mouse' })
    down.currentTarget = handle

    act(() => {
      result.current.onPointerDown(down)
    })

    const move = createPointerEvent('pointermove', { clientY: 80, pointerType: 'mouse' })
    act(() => {
      docHandlers.pointermove(move)
    })

    expect(setBodyHeight).toHaveBeenCalledWith(130)
    expect(move.preventDefault).toHaveBeenCalled()
  })

  it('resets to null when allowExpandToContent and dragged past content', () => {
    const { result, handle, setBodyHeight, docHandlers } = setupResizeHook({ allowExpandToContent: true })
    const down = createPointerEvent('pointerdown', { clientY: 50, pointerType: 'mouse' })
    down.currentTarget = handle

    act(() => {
      result.current.onPointerDown(down)
    })

    const move = createPointerEvent('pointermove', { clientY: 200, pointerType: 'mouse' })
    act(() => {
      docHandlers.pointermove(move)
    })

    expect(setBodyHeight).toHaveBeenCalledWith(null)
  })
})
