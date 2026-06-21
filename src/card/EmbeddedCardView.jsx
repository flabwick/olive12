import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { CardHeader } from './CardHeader'
import { markdownToHtml } from './richTextLogic'
import { useEmbedEntries } from './EmbedEntriesContext'
import './EmbeddedCardView.css'

const MIN_BODY_HEIGHT = 40

export function EmbeddedCardView({ node, deleteNode }) {
  const { cardId } = node.attrs
  const cards = useEmbedEntries()
  const card = cards.find((c) => c.id === cardId)
  const [foldState, setFoldState] = useState(false)
  const [flipped, setFlipped] = useState(false)
  const [bodyHeight, setBodyHeight] = useState(null)
  const bodyAreaRef = useRef(null)
  const resizeHandleRef = useRef(null)

  // If content outgrows a manual resize, expand back to fit.
  useLayoutEffect(() => {
    const area = bodyAreaRef.current
    if (!area || bodyHeight === null || flipped) return
    if (area.scrollHeight > area.clientHeight + 1) {
      setBodyHeight(null)
    }
  }, [card?.body, card?.back, bodyHeight, flipped])

  // Native listener on the element itself fires before ProseMirror's bubble-phase
  // handler on the editor parent, so stopPropagation() actually reaches ProseMirror
  // before it can start an atom-node selection drag.
  useEffect(() => {
    const el = resizeHandleRef.current
    if (!el) return

    function handleMouseDown(e) {
      e.preventDefault()
      e.stopPropagation()

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

    el.addEventListener('mousedown', handleMouseDown)
    return () => el.removeEventListener('mousedown', handleMouseDown)
  }, []) // bodyAreaRef and setBodyHeight are stable refs/setters

  return (
    <NodeViewWrapper as="span" className="embedded-card-view" contentEditable={false}>
      {card ? (
        <>
          <CardHeader
            title={card.title}
            folded={foldState}
            flipped={flipped}
            location={card.location || 'none'}
            onToggleFold={() => setFoldState((v) => !v)}
            onFlip={() => setFlipped((v) => !v)}
            onClose={deleteNode}
          />
          {!foldState && (
            <>
              <div
                className="embedded-card-view__body"
                ref={bodyAreaRef}
                style={bodyHeight !== null ? { height: bodyHeight, overflowY: 'auto' } : undefined}
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(flipped ? card.back || '' : card.body || ''),
                }}
              />
              {!flipped && (
                <div
                  ref={resizeHandleRef}
                  className="embedded-card-view__resize-handle"
                  role="separator"
                  aria-label="Resize embedded card"
                  aria-orientation="horizontal"
                />
              )}
            </>
          )}
        </>
      ) : (
        <span className="embedded-card-view__missing">{`[[${cardId ?? '?'}]]`}</span>
      )}
    </NodeViewWrapper>
  )
}
