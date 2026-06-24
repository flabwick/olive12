import { useEffect, useRef, useState } from 'react'
import './InlineRename.css'

export function InlineRename({ value, checkConflict, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value)
  const [hasConflict, setHasConflict] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function updateDraft(v) {
    setDraft(v)
    setHasConflict(checkConflict ? checkConflict(v.trim()) : false)
  }

  function commit() {
    const trimmed = draft.trim()
    if (!trimmed) { onCancel(); return }
    onCommit(trimmed, hasConflict)
  }

  function handleBlur() {
    if (hasConflict) {
      onCancel()
    } else {
      commit()
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  return (
    <input
      ref={inputRef}
      className={`vault-inline-rename${hasConflict ? ' vault-inline-rename--conflict' : ''}`}
      value={draft}
      onChange={(e) => updateDraft(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      aria-label="Rename"
      aria-invalid={hasConflict}
    />
  )
}
