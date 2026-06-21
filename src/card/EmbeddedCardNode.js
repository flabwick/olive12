import { Node, mergeAttributes } from '@tiptap/core'

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

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'embedded-card-node' }),
      `[[${node.attrs.cardId ?? '?'}]]`,
    ]
  },
})
