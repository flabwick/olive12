import { useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import { CardHeader } from './CardHeader'
import { markdownToHtml } from './richTextLogic'
import { useEmbedEntries } from './EmbedEntriesContext'
import './EmbeddedCardView.css'

export function EmbeddedCardView({ node, deleteNode }) {
  const { cardId } = node.attrs
  const cards = useEmbedEntries()
  const card = cards.find((c) => c.id === cardId)
  const [foldState, setFoldState] = useState(false)
  const [flipped, setFlipped] = useState(false)

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
            <div
              className="embedded-card-view__body"
              dangerouslySetInnerHTML={{
                __html: markdownToHtml(flipped ? card.back || '' : card.body || ''),
              }}
            />
          )}
        </>
      ) : (
        <span className="embedded-card-view__missing">{`[[${cardId ?? '?'}]]`}</span>
      )}
    </NodeViewWrapper>
  )
}
