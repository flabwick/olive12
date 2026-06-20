import { describe, expect, it } from 'vitest'
import { parseDockPromptContent } from './parseDockPromptContent'

describe('parseDockPromptContent', () => {
  it('returns defaults for empty content', () => {
    expect(parseDockPromptContent('')).toEqual({ title: 'Response', body: '' })
    expect(parseDockPromptContent('   ')).toEqual({ title: 'Response', body: '' })
  })

  it('uses line 1 as title and preserves multi-paragraph body', () => {
    const content = 'Charles Darwin Biography\n\nCharles Robert Darwin was born in Shrewsbury.\n\nHe later wrote On the Origin of Species.'
    expect(parseDockPromptContent(content)).toEqual({
      title: 'Charles Darwin Biography',
      body: 'Charles Robert Darwin was born in Shrewsbury.\n\nHe later wrote On the Origin of Species.',
    })
  })

  it('does not split body at internal paragraph breaks (regression)', () => {
    const paragraph1 =
      'Charles Robert Darwin was a British naturalist, biologist, and geologist who is best known for his theory of evolution through natural selection. Born on February 12,'
    const content = `${paragraph1}\n\n1809, in Shrewsbury, England. He was the fifth of six children.`
    expect(parseDockPromptContent(content)).toEqual({
      title: 'Response',
      body: content,
    })
  })

  it('title on line 1 with body paragraphs that contain blank lines', () => {
    const content = 'Darwin Notes\n\nFirst paragraph.\n\nSecond paragraph after blank line.'
    expect(parseDockPromptContent(content)).toEqual({
      title: 'Darwin Notes',
      body: 'First paragraph.\n\nSecond paragraph after blank line.',
    })
  })

  it('falls back when line 1 is title and rest is single block', () => {
    const content = 'Short title\nBody line one\nBody line two'
    expect(parseDockPromptContent(content)).toEqual({
      title: 'Short title',
      body: 'Body line one\nBody line two',
    })
  })

  it('uses full content for both when there is no newline', () => {
    const content = 'Only one line of text'
    expect(parseDockPromptContent(content)).toEqual({
      title: 'Only one line of text',
      body: '',
    })
  })

  it('preserves long multi-paragraph bodies without truncation', () => {
    const longBody = 'A'.repeat(5000)
    const content = `Title\n\n${longBody}`
    const result = parseDockPromptContent(content)
    expect(result.title).toBe('Title')
    expect(result.body).toBe(longBody)
    expect(result.body).toHaveLength(5000)
  })
})
