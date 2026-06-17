import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CardHeader } from './CardHeader'
import './Card.css'

const MIN_BODY_HEIGHT = 40

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export function Card({
  title,
  body,
  foldState = false,
  hiddenState = false,
  location = 'none',
  onToggleFold,
  onToggleHide,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onClose,
  onSaveToShelf,
  onMoveToLibrary,
}) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftBody, setDraftBody] = useState(body)
  const [bodyHeight, setBodyHeight] = useState(null)
  const bodyRef = useRef(null)
  const titleInputRef = useRef(null)
  const bodyAreaRef = useRef(null)
  const pendingBodyHeightRef = useRef(null)
  const focusTargetRef = useRef('body')

  useEffect(() => {
    if (!editing) {
      setDraftTitle(title)
      setDraftBody(body)
    }
  }, [title, body, editing])

  useEffect(() => {
    if (!editing) return
    if (focusTargetRef.current === 'title') {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    } else {
      bodyRef.current?.focus()
    }
  }, [editing])

  useLayoutEffect(() => {
    if (!editing || !bodyRef.current) return
    const el = bodyRef.current
    if (pendingBodyHeightRef.current !== null) {
      el.style.height = pendingBodyHeightRef.current + 'px'
      pendingBodyHeightRef.current = null
    } else {
      autoResize(el)
    }
  }, [editing, draftBody])

  function startEditing(target = 'body') {
    pendingBodyHeightRef.current = bodyAreaRef.current?.offsetHeight ?? null
    focusTargetRef.current = target
    setDraftTitle(title)
    setDraftBody(body)
    setEditing(true)
  }

  function commitEdit(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setEditing(false)
    if (draftTitle !== title || draftBody !== body) {
      onUpdate?.({ title: draftTitle, body: draftBody })
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setEditing(false)
      setDraftTitle(title)
      setDraftBody(body)
    }
  }

  function startResize(e) {
    e.preventDefault()
    const area = bodyAreaRef.current
    if (!area) return
    const startY = e.clientY
    const startHeight = area.offsetHeight

    function onMouseMove(mv) {
      const delta = mv.clientY - startY
      const newHeight = startHeight + delta
      if (newHeight >= area.scrollHeight) {
        setBodyHeight(null)
      } else {
        setBodyHeight(Math.max(MIN_BODY_HEIGHT, newHeight))
      }
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  const locationButton =
    location === 'none' && onSaveToShelf ? (
      <button type="button" className="card__location-btn" onClick={onSaveToShelf}>
        Save to Shelf
      </button>
    ) : location === 'shelf' && onMoveToLibrary ? (
      <button type="button" className="card__location-btn" onClick={onMoveToLibrary}>
        Move to Library
      </button>
    ) : null

  return (
    <div
      className={`card${hiddenState ? ' card--hidden' : ''}`}
      onBlur={editing ? commitEdit : undefined}
      onKeyDown={editing ? handleKeyDown : undefined}
    >
      <CardHeader
        title={editing ? draftTitle : title}
        editing={editing}
        onTitleChange={setDraftTitle}
        inputRef={titleInputRef}
        onTitleClick={onUpdate ? () => startEditing('title') : undefined}
        folded={foldState}
        hidden={hiddenState}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onClose={onClose}
      />
      {!foldState && (
        <>
          <div
            className="card__body-area"
            ref={bodyAreaRef}
            style={bodyHeight !== null ? { height: bodyHeight, overflowY: 'auto' } : undefined}
          >
            {editing ? (
              <textarea
                ref={bodyRef}
                className="card__body card__body--edit"
                value={draftBody}
                onChange={(e) => {
                  setDraftBody(e.target.value)
                  autoResize(e.target)
                }}
                aria-label="Card body"
              />
            ) : (
              <p
                className="card__body"
                onClick={onUpdate ? () => startEditing('body') : undefined}
                role={onUpdate ? 'button' : undefined}
                tabIndex={onUpdate ? 0 : undefined}
                onKeyDown={onUpdate ? (e) => e.key === 'Enter' && startEditing() : undefined}
              >
                {body}
              </p>
            )}
          </div>
          <div
            className="card__resize-handle"
            role="separator"
            aria-label="Resize card"
            aria-orientation="horizontal"
            onMouseDown={startResize}
          />
        </>
      )}
      {locationButton && <div className="card__footer">{locationButton}</div>}
    </div>
  )
}
