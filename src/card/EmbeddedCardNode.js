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
    // stopEvent: () => true tells ProseMirror not to handle any DOM events that
    // originate inside this NodeView. Without this, ProseMirror's default
    // stopEvent implementation returns false for mousedown on selectable atom
    // nodes, causing it to claim the event and start a node-selection drag
    // before any React handlers run. Drag/drop events are passed through so
    // the surrounding editor can still handle them normally.
    return ReactNodeViewRenderer(EmbeddedCardView, {
      stopEvent: ({ event }) => !event.type.startsWith('drag'),
    })
  },
})
