import { describe, expect, it } from 'vitest'
import { canFlip } from './flipLogic'

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
