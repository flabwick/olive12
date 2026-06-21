import { NodeViewWrapper } from '@tiptap/react'
import { markdownToHtml } from './richTextLogic'
import { useEmbedEntries } from './EmbedEntriesContext'
import './EmbeddedCardView.css'

export function EmbeddedCardView({ node }) {
  const { cardId } = node.attrs
  const cards = useEmbedEntries()
  const card = cards.find((c) => c.id === cardId)

  return (
    <NodeViewWrapper as="span" className="embedded-card-view" contentEditable={false}>
      {card ? (
        <>
          {card.title && (
            <span className="embedded-card-view__title">{card.title}</span>
          )}
          {card.body && (
            <span
              className="embedded-card-view__body"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(card.body) }}
            />
          )}
        </>
      ) : (
        <span className="embedded-card-view__missing">{`[[${cardId ?? '?'}]]`}</span>
      )}
    </NodeViewWrapper>
  )
}
