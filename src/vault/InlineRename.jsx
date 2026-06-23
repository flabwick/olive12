import { useEffect, useRef, useState } from 'react'
import './InlineRename.css'

export function InlineRename({ value, onCommit, onCancel }) {
  const [draft, setDraft] = useState(value)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  function commit() {
    const trimmed = draft.trim()
    if (trimmed) onCommit(trimmed)
    else onCancel()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); commit() }
    if (e.key === 'Escape') { e.preventDefault(); onCancel() }
  }

  return (
    <input
      ref={inputRef}
      className="vault-inline-rename"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      aria-label="Rename"
    />
  )
}
