import { useLayoutEffect, useRef, useState } from 'react'
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

  // If content outgrows a manual resize, expand back to fit.
  useLayoutEffect(() => {
    const area = bodyAreaRef.current
    if (!area || bodyHeight === null || flipped) return
    if (area.scrollHeight > area.clientHeight + 1) {
      setBodyHeight(null)
    }
  }, [card?.body, card?.back, bodyHeight, flipped])

  function startResize(e) {
    e.preventDefault()
    const area = bodyAreaRef.current
    if (!area) return

    // setPointerCapture routes all subsequent pointermove/pointerup events
    // directly to this element at the OS level — bypasses ProseMirror's event
    // routing entirely, so no document listener race and no selection drag.
    const handle = e.currentTarget
    handle.setPointerCapture(e.pointerId)

    const startY = e.clientY
    const startHeight = area.offsetHeight

    function onPointerMove(mv) {
      const newHeight = startHeight + (mv.clientY - startY)
      setBodyHeight(Math.max(MIN_BODY_HEIGHT, newHeight))
    }

    function onPointerUp() {
      handle.releasePointerCapture(e.pointerId)
      handle.removeEventListener('pointermove', onPointerMove)
      handle.removeEventListener('pointerup', onPointerUp)
    }

    handle.addEventListener('pointermove', onPointerMove)
    handle.addEventListener('pointerup', onPointerUp)
  }

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
                style={bodyHeight !== null ? { height: bodyHeight, maxHeight: 'none', overflowY: 'auto' } : undefined}
                dangerouslySetInnerHTML={{
                  __html: markdownToHtml(flipped ? card.back || '' : card.body || ''),
                }}
              />
              {!flipped && (
                <div
                  className="embedded-card-view__resize-handle"
                  role="separator"
                  aria-label="Resize embedded card"
                  aria-orientation="horizontal"
                  onPointerDown={startResize}
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
