import { describe, expect, it } from 'vitest'
import { parseStreamChunk } from './streamParser'

describe('parseStreamChunk', () => {
  it('extracts delta content from a valid data line', () => {
    const line = 'data: {"choices":[{"delta":{"content":"Hello"}}]}'
    expect(parseStreamChunk(line)).toBe('Hello')
  })

  it('returns null for the [DONE] sentinel', () => {
    expect(parseStreamChunk('data: [DONE]')).toBeNull()
  })

  it('returns null for a keep-alive comment line', () => {
    expect(parseStreamChunk(': ping')).toBeNull()
  })

  it('returns null for a blank line', () => {
    expect(parseStreamChunk('')).toBeNull()
  })

  it('returns null for a non-data event line', () => {
    expect(parseStreamChunk('event: error')).toBeNull()
  })

  it('returns null for malformed JSON after data:', () => {
    expect(parseStreamChunk('data: {not json}')).toBeNull()
  })

  it('returns null when delta has no content field', () => {
    const line = 'data: {"choices":[{"delta":{}}]}'
    expect(parseStreamChunk(line)).toBeNull()
  })

  it('returns null when choices array is empty', () => {
    const line = 'data: {"choices":[]}'
    expect(parseStreamChunk(line)).toBeNull()
  })

  it('returns empty string when delta content is empty string', () => {
    const line = 'data: {"choices":[{"delta":{"content":""}}]}'
    expect(parseStreamChunk(line)).toBe('')
  })

  it('handles multi-word delta content', () => {
    const line = 'data: {"choices":[{"delta":{"content":"Hello world\\n"}}]}'
    expect(parseStreamChunk(line)).toBe('Hello world\n')
  })

  it('returns null for a finish_reason stop chunk with no content', () => {
    const line = 'data: {"choices":[{"delta":{},"finish_reason":"stop"}]}'
    expect(parseStreamChunk(line)).toBeNull()
  })
})
