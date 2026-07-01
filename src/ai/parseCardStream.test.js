import { describe, expect, it } from 'vitest'
import { parseCardStream } from './parseCardStream'

const FULL = (title, body) =>
  `<card><type>text</type><title>${title}</title><body>\n${body}\n</body></card>`

describe('parseCardStream', () => {
  it('returns all fields from a complete response', () => {
    const result = parseCardStream(FULL('My title', 'My body'))
    expect(result).toEqual({ type: 'text', title: 'My title', body: 'My body', done: true })
  })

  it('returns nulls before any tags arrive', () => {
    expect(parseCardStream('')).toEqual({ type: null, title: null, body: null, done: false })
    expect(parseCardStream('some random text')).toEqual({ type: null, title: null, body: null, done: false })
  })

  it('type is null until </type> is received', () => {
    expect(parseCardStream('<card><type>tex')).toMatchObject({ type: null })
    expect(parseCardStream('<card><type>text</type>')).toMatchObject({ type: 'text' })
  })

  it('title is null until </title> is received', () => {
    expect(parseCardStream('<card><type>text</type><title>My ti')).toMatchObject({ title: null })
    expect(parseCardStream('<card><type>text</type><title>My title</title>')).toMatchObject({ title: 'My title' })
  })

  it('empty title tag falls back to Response', () => {
    expect(parseCardStream('<card><type>text</type><title></title>')).toMatchObject({ title: 'Response' })
    expect(parseCardStream('<card><type>text</type><title>   </title>')).toMatchObject({ title: 'Response' })
  })

  it('body is null until <body> opens', () => {
    expect(parseCardStream('<card><type>text</type><title>T</title>')).toMatchObject({ body: null })
  })

  it('streams body content before </body> arrives', () => {
    const partial = '<card><type>text</type><title>T</title><body>\nLine one\nLine two\n'
    const result = parseCardStream(partial)
    expect(result.body).toBe('Line one\nLine two')
    expect(result.done).toBe(false)
  })

  it('strips a partial closing tag at the end of streaming body', () => {
    const partial = '<card><type>text</type><title>T</title><body>\nContent here\n</bo'
    expect(parseCardStream(partial).body).toBe('Content here')
  })

  it('strips a lone < at the end of streaming body', () => {
    const partial = '<card><type>text</type><title>T</title><body>\nContent<'
    expect(parseCardStream(partial).body).toBe('Content')
  })

  it('done is true when </body> appears', () => {
    const s = '<card><type>text</type><title>T</title><body>B</body>'
    expect(parseCardStream(s).done).toBe(true)
  })

  it('done is true when </card> appears', () => {
    expect(parseCardStream(FULL('T', 'B')).done).toBe(true)
  })

  it('trims whitespace from title and body', () => {
    const s = '<card><type>text</type><title>  Trimmed  </title><body>  Body  </body></card>'
    const result = parseCardStream(s)
    expect(result.title).toBe('Trimmed')
    expect(result.body).toBe('Body')
  })

  it('handles multi-line body', () => {
    const s = FULL('T', 'Line one\nLine two\nLine three')
    expect(parseCardStream(s).body).toBe('Line one\nLine two\nLine three')
  })

  it('body is null (not empty string) when <body> just opened with no content', () => {
    const partial = '<card><type>text</type><title>T</title><body>'
    expect(parseCardStream(partial).body).toBeNull()
  })
})
