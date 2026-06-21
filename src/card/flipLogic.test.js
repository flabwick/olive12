import { describe, expect, it } from 'vitest'
import { canFlip, isFlipped, toggleFlip } from './flipLogic'

describe('canFlip', () => {
  it('returns true for a text card with non-empty back', () => {
    expect(canFlip({ type: 'text', back: 'The answer' })).toBe(true)
  })

  it('returns false for a text card with empty back', () => {
    expect(canFlip({ type: 'text', back: '' })).toBe(false)
  })

  it('returns false for a text card with whitespace-only back', () => {
    expect(canFlip({ type: 'text', back: '   ' })).toBe(false)
  })

  it('returns false for a portal card with non-empty back', () => {
    expect(canFlip({ type: 'portal', back: 'Some back' })).toBe(false)
  })

  it('returns false for null', () => {
    expect(canFlip(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(canFlip(undefined)).toBe(false)
  })
})

describe('toggleFlip', () => {
  it('adds a missing id', () => {
    const result = toggleFlip(new Set(), 'card-1')
    expect(result.has('card-1')).toBe(true)
  })

  it('removes an existing id', () => {
    const result = toggleFlip(new Set(['card-1']), 'card-1')
    expect(result.has('card-1')).toBe(false)
  })

  it('does not mutate the original Set', () => {
    const original = new Set(['card-1'])
    toggleFlip(original, 'card-1')
    expect(original.has('card-1')).toBe(true)
  })
})

describe('isFlipped', () => {
  it('returns true when the id is present', () => {
    expect(isFlipped(new Set(['card-1']), 'card-1')).toBe(true)
  })

  it('returns false when the id is absent', () => {
    expect(isFlipped(new Set(['card-2']), 'card-1')).toBe(false)
  })

  it('returns false on an empty Set', () => {
    expect(isFlipped(new Set(), 'card-1')).toBe(false)
  })
})
