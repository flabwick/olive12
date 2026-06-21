import { describe, expect, it } from 'vitest'
import { markdownToHtml, htmlToMarkdown, isEmptyMarkdown } from './richTextLogic'

describe('markdownToHtml', () => {
  it('converts bold', () => {
    expect(markdownToHtml('**bold**')).toContain('<strong>bold</strong>')
  })

  it('converts italic', () => {
    expect(markdownToHtml('_italic_')).toContain('<em>italic</em>')
  })

  it('converts heading', () => {
    expect(markdownToHtml('# Title')).toContain('<h1>Title</h1>')
  })

  it('converts unordered list', () => {
    const html = markdownToHtml('- one\n- two')
    expect(html).toContain('<ul>')
    expect(html).toContain('<li>one</li>')
  })

  it('returns empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('')
    expect(markdownToHtml('   ')).toBe('')
  })
})

describe('htmlToMarkdown', () => {
  it('converts strong to bold', () => {
    expect(htmlToMarkdown('<strong>bold</strong>')).toBe('**bold**')
  })

  it('converts em to italic', () => {
    expect(htmlToMarkdown('<em>italic</em>')).toBe('_italic_')
  })

  it('converts h1 to atx heading', () => {
    expect(htmlToMarkdown('<h1>Title</h1>')).toBe('# Title')
  })

  it('converts del to strikethrough', () => {
    expect(htmlToMarkdown('<del>gone</del>')).toBe('~~gone~~')
  })

  it('returns empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('')
  })

  it('roundtrips bold text', () => {
    const md = '**hello world**'
    expect(htmlToMarkdown(markdownToHtml(md))).toBe(md)
  })
})

describe('embed token [[cardId]]', () => {
  it('markdownToHtml converts [[cardId]] to a span with data-card-id', () => {
    expect(markdownToHtml('[[card-1]]')).toContain('data-card-id="card-1"')
  })

  it('htmlToMarkdown converts span[data-card-id] with inner text back to [[cardId]]', () => {
    expect(htmlToMarkdown('<p><span data-card-id="card-1">[[card-1]]</span></p>')).toBe('[[card-1]]')
  })

  it('htmlToMarkdown handles span with class from EmbeddedCardNode renderHTML', () => {
    expect(htmlToMarkdown('<p><span data-card-id="card-1" class="embedded-card-node">[[card-1]]</span></p>')).toBe('[[card-1]]')
  })

  it('roundtrips multiple [[cardId]] tokens through markdownToHtml then htmlToMarkdown', () => {
    expect(htmlToMarkdown(markdownToHtml('see [[card-1]] and [[card-2]]'))).toBe('see [[card-1]] and [[card-2]]')
  })
})

describe('isEmptyMarkdown', () => {
  it('returns true for empty string', () => {
    expect(isEmptyMarkdown('')).toBe(true)
  })

  it('returns true for whitespace-only', () => {
    expect(isEmptyMarkdown('   ')).toBe(true)
  })

  it('returns true for null/undefined', () => {
    expect(isEmptyMarkdown(null)).toBe(true)
    expect(isEmptyMarkdown(undefined)).toBe(true)
  })

  it('returns false for non-empty text', () => {
    expect(isEmptyMarkdown('hello')).toBe(false)
  })
})
