import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CardBack } from './CardBack'
import { CardHeader } from './CardHeader'
import { RichTextEditor } from './RichTextEditor'
import './Card.css'

const MIN_BODY_HEIGHT = 40

export function Card({
  title,
  body,
  back = '',
  cardId,
  createdAt,
  updatedAt,
  flipped = false,
  foldState = false,
  hiddenState = false,
  location = 'none',
  folders = [],
  onFlip,
  onToggleFold,
  onToggleHide,
  onMoveUp,
  onMoveDown,
  onUpdate,
  onClose,
  onSaveToShelf,
  onMoveToLibrary,
  indexEntry,
  indexLoading = false,
  editorSurface = 'tab',
}) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftBody, setDraftBody] = useState(body)
  const [draftBack, setDraftBack] = useState(back)
  const [bodyHeight, setBodyHeight] = useState(null)
  const titleInputRef = useRef(null)
  const bodyAreaRef = useRef(null)
  const focusTargetRef = useRef('body')

  useEffect(() => {
    if (!editing) {
      setDraftTitle(title)
      setDraftBody(body)
      setDraftBack(back)
    }
  }, [title, body, back, editing])

  useEffect(() => {
    if (!editing) return
    if (focusTargetRef.current === 'title') {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
    // body focus is handled by RichTextEditor's editable-change effect
    // 'back' focus is handled by CardBack's internal useEffect
  }, [editing])

  // If content outgrows a manual resize, expand back to fit — cards are not height-capped.
  useLayoutEffect(() => {
    const area = bodyAreaRef.current
    if (!area || bodyHeight === null || flipped || editing) return
    if (area.scrollHeight > area.clientHeight + 1) {
      setBodyHeight(null)
    }
  }, [body, back, bodyHeight, flipped, editing])

  function startEditing(target = 'body') {
    focusTargetRef.current = target
    setDraftTitle(title)
    setDraftBody(body)
    setDraftBack(back)
    setEditing(true)
  }

  function commitEdit(e) {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setEditing(false)
    if (flipped) {
      if (draftBack !== back) {
        onUpdate?.({ back: draftBack })
      }
    } else {
      if (draftTitle !== title || draftBody !== body) {
        onUpdate?.({ title: draftTitle, body: draftBody })
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setEditing(false)
      setDraftTitle(title)
      setDraftBody(body)
      setDraftBack(back)
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

  return (
    <div
      className={`card${hiddenState ? ' card--hidden' : ''}${flipped ? ' card--flipped' : ''}`}
      onBlur={editing ? commitEdit : undefined}
      onKeyDown={editing ? handleKeyDown : undefined}
    >
      <CardHeader
        title={editing && !flipped ? draftTitle : title}
        editing={editing && !flipped}
        onTitleChange={setDraftTitle}
        inputRef={titleInputRef}
        onTitleClick={onUpdate && !flipped ? () => startEditing('title') : undefined}
        folded={foldState}
        hidden={hiddenState}
        flipped={flipped}
        location={location}
        folders={folders}
        onSaveToShelf={onSaveToShelf}
        onMoveToLibrary={onMoveToLibrary}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onFlip={onFlip}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onClose={onClose}
      />
      {!foldState && (
        <>
          <div
            className="card__body-area"
            ref={bodyAreaRef}
            style={bodyHeight !== null && !flipped ? { height: bodyHeight, overflowY: 'auto' } : undefined}
          >
            {flipped ? (
              <div
                onClick={onUpdate && !editing ? (e) => {
                  if (!e.target.closest('.card-back__flip')) startEditing('back')
                } : undefined}
              >
                <CardBack
                  back={editing ? draftBack : back}
                  editing={editing}
                  onBackChange={setDraftBack}
                  onFlip={onFlip}
                  cardId={cardId}
                  createdAt={createdAt}
                  updatedAt={updatedAt}
                  location={location}
                  indexEntry={indexEntry}
                  indexLoading={indexLoading}
                />
              </div>
            ) : (
              <div
                onClick={!editing && onUpdate ? () => startEditing('body') : undefined}
                className="card__body-rte-wrapper"
              >
                <RichTextEditor
                  value={editing ? draftBody : body}
                  onChange={setDraftBody}
                  editable={editing && !!onUpdate}
                  ariaLabel="Card body"
                  cardId={cardId}
                  editorSurface={editorSurface}
                />
              </div>
            )}
          </div>
          {!flipped && (
            <div
              className="card__resize-handle"
              role="separator"
              aria-label="Resize card"
              aria-orientation="horizontal"
              onMouseDown={startResize}
            />
          )}
        </>
      )}
    </div>
  )
}
