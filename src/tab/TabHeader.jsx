import { useEffect, useRef, useState } from 'react'
import './TabHeader.css'

export function TabHeader({ name, savedLocation, onRename, onSaveToShelf, onMoveToLibrary }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    }
  }, [editing])

  function handleNameClick() {
    setDraft(name)
    setEditing(true)
  }

  function commit() {
    const trimmed = draft.trim()
    if (trimmed && trimmed !== name) onRename?.(trimmed)
    setEditing(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  function handleSaveClick() {
    if (savedLocation === 'none') onSaveToShelf?.()
    else if (savedLocation === 'shelf') onMoveToLibrary?.()
  }

  const showSaveButton = savedLocation === 'none' ? !!onSaveToShelf
    : savedLocation === 'shelf' ? !!onMoveToLibrary
    : savedLocation === 'library'

  const saveLabel = savedLocation === 'none' ? 'Save tab to Shelf'
    : savedLocation === 'shelf' ? 'Tab saved to Shelf — click to move to Library'
    : 'Tab in Library'

  const saveDisabled = savedLocation === 'library'

  return (
    <div className="tab-header">
      <div className="tab-header__name">
        {editing ? (
          <input
            ref={inputRef}
            className="tab-header__input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <h2 className="tab-header__title" onClick={handleNameClick}>
            {name}
          </h2>
        )}
      </div>
      {showSaveButton && (
        <button
          type="button"
          className="tab-header__save"
          aria-label={saveLabel}
          disabled={saveDisabled}
          onClick={handleSaveClick}
        >
          {savedLocation === 'none' ? '+' : '✓'}
        </button>
      )}
    </div>
  )
}
