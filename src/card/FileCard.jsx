import { useEffect, useRef, useState } from 'react'
import { CardHeader } from './CardHeader'
import { fileTypeLabel, formatFileSize } from './createFileCard'
import './FileCard.css'

function FileDocIcon() {
  return (
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" aria-hidden="true" className="file-card__doc-icon">
      <path
        d="M4 1.5h14l8 8V33a1.5 1.5 0 01-1.5 1.5H4A1.5 1.5 0 012.5 33V3A1.5 1.5 0 014 1.5z"
        fill="currentColor" fillOpacity="0.08"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
      <path d="M18 1.5V9.5H26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="7" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="7" y1="26" x2="15" y2="26" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function FileCard({
  title,
  fileName,
  fileType = '',
  fileSize,
  cardId,
  location = 'none',
  foldState = false,
  hiddenState = false,
  onToggleFold,
  onToggleHide,
  onClose,
  onUpdate,
  onSaveToShelf,
  onSendToDock,
  onSendToTab,
}) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const titleInputRef = useRef(null)
  const label = fileTypeLabel(fileType, fileName)
  const sizeStr = formatFileSize(fileSize)

  useEffect(() => {
    if (!editing) setDraftTitle(title)
  }, [title, editing])

  useEffect(() => {
    if (editing) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editing])

  function commitTitle(e) {
    if (e?.currentTarget?.contains(e.relatedTarget)) return
    setEditing(false)
    const trimmed = draftTitle.trim()
    if (trimmed && trimmed !== title) onUpdate?.({ title: trimmed })
    else setDraftTitle(title)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitTitle()
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setDraftTitle(title)
    }
  }

  return (
    <div
      className={`file-card${hiddenState ? ' file-card--hidden' : ''}`}
      onBlur={editing ? commitTitle : undefined}
      onKeyDown={editing ? handleKeyDown : undefined}
    >
      <CardHeader
        title={editing ? draftTitle : title}
        editing={editing}
        onTitleChange={setDraftTitle}
        inputRef={titleInputRef}
        onTitleClick={onUpdate ? () => setEditing(true) : undefined}
        folded={foldState}
        hidden={hiddenState}
        location={location}
        onSaveToShelf={onSaveToShelf}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onSendToDock={onSendToDock}
        onSendToTab={onSendToTab}
        onClose={onClose}
      />
      {!foldState && (
        <div className="file-card__body">
          <FileDocIcon />
          <div className="file-card__meta">
            <span className="file-card__filename">{fileName || '(unknown file)'}</span>
            <div className="file-card__details">
              <span className="file-card__type-badge">{label}</span>
              {sizeStr && <span className="file-card__size">{sizeStr}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
