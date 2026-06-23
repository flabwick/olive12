import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VaultContextMenu.css'

// item shapes:
//   { type: 'action', label, onClick }
//   { type: 'submenu', label, items: MenuItem[] }
//   { type: 'confirm', label, confirmLabel, onClick }
//   { type: 'confirm-two', label, choices: [{ label, onClick }] }
//   { type: 'divider' }

function useAutoPosition(ref, position) {
  const [pos, setPos] = useState(position)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    let { x, y } = position
    if (x + width > window.innerWidth) x = Math.max(0, x - width)
    if (y + height > window.innerHeight) y = Math.max(0, y - height)
    setPos({ x, y })
  }, [position, ref])
  return pos
}

export function VaultContextMenu({ items, position, onClose }) {
  const menuRef = useRef(null)
  const pos = useAutoPosition(menuRef, position)
  const [confirmingId, setConfirmingId] = useState(null)
  const [openSubmenuId, setOpenSubmenuId] = useState(null)

  useEffect(() => {
    function onDown(e) {
      if (!menuRef.current?.contains(e.target)) onClose()
    }
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', onDown, true)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  function handleAction(item) {
    item.onClick()
    onClose()
  }

  function renderItem(item, idx) {
    if (item.type === 'divider') {
      return <hr key={idx} className="vault-context-menu__divider" />
    }

    if (item.type === 'action') {
      return (
        <button
          key={idx}
          className="vault-context-menu__item"
          onClick={() => handleAction(item)}
        >
          {item.label}
        </button>
      )
    }

    if (item.type === 'confirm') {
      if (confirmingId === idx) {
        return (
          <button
            key={idx}
            className="vault-context-menu__item vault-context-menu__item--danger"
            onClick={() => { item.onClick(); onClose() }}
          >
            {item.confirmLabel ?? 'Confirm'}
          </button>
        )
      }
      return (
        <button
          key={idx}
          className="vault-context-menu__item"
          onClick={() => setConfirmingId(idx)}
        >
          {item.label}
        </button>
      )
    }

    if (item.type === 'confirm-two') {
      if (confirmingId === idx) {
        return (
          <div key={idx} className="vault-context-menu__confirm-two">
            <span className="vault-context-menu__confirm-label">{item.label}:</span>
            {item.choices.map((choice, ci) => (
              <button
                key={ci}
                className="vault-context-menu__item vault-context-menu__item--choice"
                onClick={() => { choice.onClick(); onClose() }}
              >
                {choice.label}
              </button>
            ))}
          </div>
        )
      }
      return (
        <button
          key={idx}
          className="vault-context-menu__item"
          onClick={() => setConfirmingId(idx)}
        >
          {item.label}
        </button>
      )
    }

    if (item.type === 'submenu') {
      return (
        <div
          key={idx}
          className="vault-context-menu__submenu-host"
          onMouseEnter={() => setOpenSubmenuId(idx)}
          onMouseLeave={() => setOpenSubmenuId(null)}
        >
          <button className="vault-context-menu__item vault-context-menu__item--submenu">
            {item.label} ›
          </button>
          {openSubmenuId === idx && (
            <div className="vault-context-menu__submenu">
              {item.items.map((sub, si) => (
                <button
                  key={si}
                  className="vault-context-menu__item"
                  onClick={() => { sub.onClick(); onClose() }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )
    }

    return null
  }

  return createPortal(
    <div
      ref={menuRef}
      className="vault-context-menu"
      style={{ left: pos.x, top: pos.y }}
      role="menu"
    >
      {items.map(renderItem)}
    </div>,
    document.body,
  )
}
