import { marked } from 'marked'
import TurndownService from 'turndown'

const td = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
})

// GFM strikethrough (~~text~~)
td.addRule('strikethrough', {
  filter: ['del', 's'],
  replacement: (content) => `~~${content}~~`,
})

// Embedded card nodes: <span data-card-id="..."> → [[cardId]]
td.addRule('embeddedCard', {
  filter: (node) => node.nodeName === 'SPAN' && node.hasAttribute('data-card-id'),
  replacement: (_, node) => `[[${node.getAttribute('data-card-id')}]]`,
})

// Marked inline extension: [[cardId]] → <span data-card-id="cardId"></span>
// Registered once at module load; code spans/blocks are parsed first by marked.
marked.use({
  extensions: [
    {
      name: 'embed',
      level: 'inline',
      start: (src) => src.indexOf('[['),
      tokenizer(src) {
        const match = /^\[\[([^\]]+)\]\]/.exec(src)
        if (match) return { type: 'embed', raw: match[0], cardId: match[1] }
      },
      renderer: (token) => `<span data-card-id="${token.cardId}">[[${token.cardId}]]</span>`,
    },
  ],
})

export function markdownToHtml(md) {
  if (!md || !md.trim()) return ''
  return /** @type {string} */ (marked.parse(md))
}

export function htmlToMarkdown(html) {
  if (!html) return ''
  return td.turndown(html).trim()
}

export function isEmptyMarkdown(md) {
  return !md || !md.trim()
}
