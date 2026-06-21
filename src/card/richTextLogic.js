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
