import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { EmbeddedCardView } from './EmbeddedCardView'

export const EmbeddedCardNode = Node.create({
  name: 'embeddedCard',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      cardId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-card-id'),
        renderHTML: (attrs) => ({ 'data-card-id': attrs.cardId }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-card-id]' }]
  },

  // renderHTML is used only for HTML export (→ Turndown serialization).
  // The visual display in the editor is handled by addNodeView below.
  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'embedded-card-node' }),
      `[[${node.attrs.cardId ?? '?'}]]`,
    ]
  },

  addNodeView() {
    // stopEvent: () => true tells ProseMirror not to handle DOM events inside
    // this NodeView (except drag). Without this, ProseMirror claims mousedown
    // on atom nodes and starts a selection drag before React handlers run.
    return ReactNodeViewRenderer(EmbeddedCardView, {
      stopEvent: ({ event }) => !event.type.startsWith('drag'),
    })
  },
})
