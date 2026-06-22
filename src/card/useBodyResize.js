import { useRef } from 'react'

const LONG_PRESS_MS = 180
const MOVE_THRESHOLD_PX = 12
const SCROLL_ZONE_PX = 80   // px from bottom of viewport that triggers auto-scroll
const SCROLL_MAX_SPEED = 14  // px per animation frame at full speed

function findScrollContainer(el) {
  return el.closest?.('.app-shell__content') ?? null
}

/**
 * Pointer-based body resize with long-press activation on touch so drag
 * does not compete with scroll. Mouse starts resizing immediately.
 *
 * Height uses document-relative Y (pageY = clientY + scrollTop) so the
 * calculation stays correct when the page auto-scrolls during a drag.
 *
 * When the pointer enters SCROLL_ZONE_PX from the viewport bottom,
 * a rAF loop scrolls the nearest .app-shell__content container and
 * continuously updates the card height to match.
 */
export function useBodyResize({
  areaRef,
  setBodyHeight,
  minHeight = 40,
  allowExpandToContent = false,
}) {
  const isResizingRef = useRef(false)

  function onPointerDown(e) {
    if (e.button !== 0) return
    const area = areaRef.current
    if (!area) return

    const handle = e.currentTarget
    const pointerId = e.pointerId
    const downX = e.clientX
    const downY = e.clientY
    let lastY = downY
    let resizing = false
    let startPageY = 0
    let startHeight = 0
    let longPressTimer = null
    let areaTouchAction = ''
    let scrollContainer = null
    let scrollRafId = null

    const listenerOpts = { passive: false }

    function stopScrollRaf() {
      if (scrollRafId !== null) {
        cancelAnimationFrame(scrollRafId)
        scrollRafId = null
      }
    }

    function startScrollRaf() {
      if (scrollRafId !== null) return
      function tick() {
        if (!resizing) { scrollRafId = null; return }
        if (scrollContainer) {
          const dist = lastY - (window.innerHeight - SCROLL_ZONE_PX)
          if (dist > 0) {
            const speed = Math.min((dist / SCROLL_ZONE_PX) * SCROLL_MAX_SPEED, SCROLL_MAX_SPEED)
            scrollContainer.scrollTop += speed
            updateHeight(lastY)
          }
        }
        scrollRafId = requestAnimationFrame(tick)
      }
      scrollRafId = requestAnimationFrame(tick)
    }

    function removeDocumentListeners() {
      document.removeEventListener('pointermove', onPointerMove, listenerOpts)
      document.removeEventListener('pointerup', onPointerUp, listenerOpts)
      document.removeEventListener('pointercancel', onPointerUp, listenerOpts)
    }

    function cleanup() {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer)
        longPressTimer = null
      }
      stopScrollRaf()
      if (resizing) {
        try {
          handle.releasePointerCapture(pointerId)
        } catch {
          // pointer may already be released
        }
        handle.classList.remove('resize-handle--active')
        area.style.touchAction = areaTouchAction
      }
      handle.classList.remove('resize-handle--arming')
      isResizingRef.current = false
      removeDocumentListeners()
    }

    function updateHeight(clientY) {
      const scrollY = scrollContainer?.scrollTop ?? 0
      const pageY = clientY + scrollY
      const newHeight = startHeight + (pageY - startPageY)
      if (allowExpandToContent && newHeight >= area.scrollHeight) {
        setBodyHeight(null)
      } else {
        setBodyHeight(Math.max(minHeight, newHeight))
      }
    }

    function activateResize(clientY) {
      resizing = true
      isResizingRef.current = true
      scrollContainer = findScrollContainer(handle)
      const scrollY = scrollContainer?.scrollTop ?? 0
      startPageY = clientY + scrollY
      startHeight = area.offsetHeight
      handle.setPointerCapture(pointerId)
      handle.classList.remove('resize-handle--arming')
      handle.classList.add('resize-handle--active')
      areaTouchAction = area.style.touchAction
      area.style.touchAction = 'none'
      startScrollRaf()
    }

    function onPointerMove(mv) {
      if (mv.pointerId !== pointerId) return
      lastY = mv.clientY

      if (!resizing) {
        const dx = mv.clientX - downX
        const dy = mv.clientY - downY
        if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) {
          cleanup()
        }
        return
      }

      mv.preventDefault()
      updateHeight(mv.clientY)
    }

    function onPointerUp(mv) {
      if (mv.pointerId !== pointerId) return
      cleanup()
    }

    document.addEventListener('pointermove', onPointerMove, listenerOpts)
    document.addEventListener('pointerup', onPointerUp, listenerOpts)
    document.addEventListener('pointercancel', onPointerUp, listenerOpts)

    if (e.pointerType === 'touch') {
      handle.classList.add('resize-handle--arming')
      longPressTimer = setTimeout(() => activateResize(lastY), LONG_PRESS_MS)
    } else {
      e.preventDefault()
      activateResize(downY)
    }
  }

  return { onPointerDown, isResizingRef }
}
