import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { CardHeader } from './CardHeader'
import { markdownToHtml } from './richTextLogic'
import { useEmbedActions, useEmbedEntries } from './EmbedEntriesContext'
import { useBodyResize } from './useBodyResize'
import './EmbeddedCardView.css'

export function EmbeddedCardView({ node, deleteNode }) {
  const { cardId } = node.attrs
  const cards = useEmbedEntries()
  const card = cards.find((c) => c.id === cardId)
  const { onSaveToShelf, onMoveToDock, onUpdate } = useEmbedActions()

  const [foldState, setFoldState] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingBody, setEditingBody] = useState(false)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftBody, setDraftBody] = useState('')
  const [bodyHeight, setBodyHeight] = useState(null)

  const titleInputRef = useRef(null)
  const bodyTextareaRef = useRef(null)
  const bodyAreaRef = useRef(null)
  const bodyHeightRef = useRef(null)
  bodyHeightRef.current = bodyHeight

  const { onPointerDown: onResizePointerDown, isResizingRef } = useBodyResize({
    areaRef: bodyAreaRef,
    setBodyHeight,
  })

  // Sync drafts when card data changes and the field is not being edited
  useEffect(() => {
    if (!editingTitle) setDraftTitle(card?.title ?? '')
  }, [card?.title, editingTitle])

  useEffect(() => {
    if (!editingBody) setDraftBody(card?.body ?? '')
  }, [card?.body, editingBody])

  // Focus title input when entering title edit mode — deferred so Tiptap
  // doesn't steal focus back during its post-click processing cycle.
  useEffect(() => {
    if (editingTitle) {
      setTimeout(() => {
        titleInputRef.current?.focus()
        titleInputRef.current?.select()
      }, 0)
    }
  }, [editingTitle])

  // Focus body textarea when entering body edit mode
  useEffect(() => {
    if (editingBody) {
      bodyTextareaRef.current?.focus()
    }
  }, [editingBody])

  useLayoutEffect(() => {
    const area = bodyAreaRef.current
    if (!area || bodyHeightRef.current === null || isResizingRef.current) return
    if (area.scrollHeight > area.clientHeight + 1) {
      setBodyHeight(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.body])

  function startEditingTitle() {
    setDraftTitle(card?.title ?? '')
    setEditingTitle(true)
  }

  function commitTitle() {
    setEditingTitle(false)
    if (draftTitle !== (card?.title ?? '')) {
      onUpdate?.(cardId, { title: draftTitle })
    }
  }

  function startEditingBody() {
    setDraftBody(card?.body ?? '')
    setEditingBody(true)
  }

  function commitBody() {
    setEditingBody(false)
    if (draftBody !== (card?.body ?? '')) {
      onUpdate?.(cardId, { body: draftBody })
    }
  }

  function autoResizeTextarea(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  return (
    <NodeViewWrapper as="span" className="embedded-card-view" contentEditable={false}>
      {card ? (
        <>
          <CardHeader
            title={editingTitle ? draftTitle : (card.title || '')}
            editing={editingTitle}
            onTitleChange={setDraftTitle}
            onTitleBlur={commitTitle}
            onTitleKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitTitle() }
              else if (e.key === 'Escape') {
                setEditingTitle(false)
                setDraftTitle(card?.title ?? '')
              }
            }}
            inputRef={titleInputRef}
            onTitleClick={onUpdate ? startEditingTitle : undefined}
            folded={foldState}
            location={card.location || 'none'}
            onSaveToShelf={onSaveToShelf ? () => onSaveToShelf(cardId) : undefined}
            onToggleFold={() => setFoldState((v) => !v)}
            onSendToDock={onMoveToDock ? () => onMoveToDock(cardId) : undefined}
            onClose={deleteNode}
          />
          {!foldState && (
            <>
              <div
                className={`embedded-card-view__body${bodyHeight !== null ? ' embedded-card-view__body--sized' : ''}`}
                ref={bodyAreaRef}
                style={bodyHeight !== null ? { height: bodyHeight, maxHeight: 'none' } : undefined}
              >
                {editingBody ? (
                  <textarea
                    ref={bodyTextareaRef}
                    className="embedded-card-view__body-edit"
                    value={draftBody}
                    onChange={(e) => {
                      setDraftBody(e.target.value)
                      autoResizeTextarea(e.target)
                    }}
                    onBlur={commitBody}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setEditingBody(false)
                        setDraftBody(card?.body ?? '')
                      }
                    }}
                  />
                ) : (
                  <div
                    className="embedded-card-view__body-content"
                    onClick={onUpdate ? startEditingBody : undefined}
                    dangerouslySetInnerHTML={{
                      __html: markdownToHtml(card.body || ''),
                    }}
                  />
                )}
              </div>
              <div
                className="embedded-card-view__resize-handle"
                role="separator"
                aria-label="Resize embedded card"
                aria-orientation="horizontal"
                onPointerDown={onResizePointerDown}
              />
            </>
          )}
        </>
      ) : (
        <span className="embedded-card-view__missing">{`[[${cardId ?? '?'}]]`}</span>
      )}
    </NodeViewWrapper>
  )
}
