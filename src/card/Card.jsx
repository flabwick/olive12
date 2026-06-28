import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { CardBack } from './CardBack'
import { CardHeader } from './CardHeader'
import { RichTextEditor } from './RichTextEditor'
import { useBodyResize } from './useBodyResize'
import './Card.css'

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
  selected = false,
  location = 'none',
  onFlip,
  onToggleFold,
  onToggleHide,
  onToggleSelect,
  onSendToTab,
  onUpdate,
  onClose,
  onSaveToShelf,
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
  const bodyHeightRef = useRef(null)
  const focusTargetRef = useRef('body')
  bodyHeightRef.current = bodyHeight
  const { onPointerDown: onResizePointerDown, isResizingRef } = useBodyResize({
    areaRef: bodyAreaRef,
    setBodyHeight,
    allowExpandToContent: true,
  })

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
  // Only re-check when content changes, not on every drag frame (bodyHeight in deps
  // caused height to snap back whenever scrollHeight > clientHeight while shrinking).
  useLayoutEffect(() => {
    const area = bodyAreaRef.current
    if (!area || bodyHeightRef.current === null || flipped || editing || isResizingRef.current) return
    if (area.scrollHeight > area.clientHeight + 1) {
      setBodyHeight(null)
    }
  }, [body, back, flipped, editing, isResizingRef])

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

  function flushAndThen(action) {
    if (editing) {
      setEditing(false)
      if (flipped) {
        if (draftBack !== back) onUpdate?.({ back: draftBack })
      } else {
        if (draftTitle !== title || draftBody !== body) {
          onUpdate?.({ title: draftTitle, body: draftBody })
        }
      }
    }
    action?.()
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      setEditing(false)
      setDraftTitle(title)
      setDraftBody(body)
      setDraftBack(back)
    }
  }

  return (
    <div
      className={`card${hiddenState ? ' card--hidden' : ''}${flipped ? ' card--flipped' : ''}${selected ? ' card--selected' : ''}`}
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
        selected={selected}
        onToggleSelect={onToggleSelect}
        location={location}
        onSaveToShelf={onSaveToShelf}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onFlip={onFlip ? () => flushAndThen(onFlip) : undefined}
        onSendToTab={onSendToTab ? () => flushAndThen(onSendToTab) : undefined}
        onClose={onClose}
      />
      {!foldState && (
        <>
          <div
            className={`card__body-area${bodyHeight !== null && !flipped ? ' card__body-area--scrollable' : ''}`}
            ref={bodyAreaRef}
            style={bodyHeight !== null && !flipped ? { height: bodyHeight } : undefined}
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
              onPointerDown={onResizePointerDown}
            />
          )}
        </>
      )}
    </div>
  )
}
