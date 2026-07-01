import { describe, expect, it } from 'vitest'
import { assembleContext } from './assembleContext'

function makeEntry(overrides = {}) {
  return {
    card: { id: 'c1', title: 'Title', body: 'Body' },
    position: 0,
    foldState: false,
    hiddenState: false,
    ...overrides,
  }
}

describe('assembleContext', () => {
  it('returns empty array for no entries', () => {
    expect(assembleContext([])).toEqual([])
  })

  it('maps a visible entry to { id, title, body }', () => {
    const entries = [makeEntry({ card: { id: 'abc', title: 'Note', body: 'Content' } })]
    expect(assembleContext(entries)).toEqual([{ id: 'abc', title: 'Note', body: 'Content' }])
  })

  it('excludes hidden cards', () => {
    const entries = [
      makeEntry({ card: { id: 'v', title: 'Visible', body: '' }, hiddenState: false }),
      makeEntry({ card: { id: 'h', title: 'Hidden', body: '' }, hiddenState: true }),
    ]
    const result = assembleContext(entries)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('v')
  })

  it('includes folded cards', () => {
    const entries = [
      makeEntry({ card: { id: 'f', title: 'Folded', body: 'Still here' }, foldState: true }),
    ]
    const result = assembleContext(entries)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('f')
  })

  it('preserves position order of the input array', () => {
    const entries = [
      makeEntry({ card: { id: 'a', title: 'A', body: '' }, position: 0 }),
      makeEntry({ card: { id: 'b', title: 'B', body: '' }, position: 1 }),
      makeEntry({ card: { id: 'c', title: 'C', body: '' }, position: 2 }),
    ]
    const ids = assembleContext(entries).map((c) => c.id)
    expect(ids).toEqual(['a', 'b', 'c'])
  })

  it('excludes all cards when all are hidden', () => {
    const entries = [
      makeEntry({ hiddenState: true }),
      makeEntry({ hiddenState: true }),
    ]
    expect(assembleContext(entries)).toEqual([])
  })
})
