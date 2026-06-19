import { describe, expect, it } from 'vitest'
import { isPortalCard, resolvePortalTarget } from './portalLogic'

const cardsById = {
  'card-a': { id: 'card-a', title: 'Target', body: 'Content', type: 'text', config: null },
}

describe('isPortalCard', () => {
  it('returns true for a portal card', () => {
    expect(isPortalCard({ type: 'portal', config: { target_card_id: 'card-a' } })).toBe(true)
  })

  it('returns false for a text card', () => {
    expect(isPortalCard({ type: 'text', config: null })).toBe(false)
  })

  it('returns false for null', () => {
    expect(isPortalCard(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isPortalCard(undefined)).toBe(false)
  })
})

describe('resolvePortalTarget', () => {
  it('returns the target card when target_card_id is found', () => {
    const portal = { type: 'portal', config: { target_card_id: 'card-a' } }
    expect(resolvePortalTarget(portal, cardsById)).toEqual(cardsById['card-a'])
  })

  it('returns null when target_card_id is null', () => {
    const portal = { type: 'portal', config: { target_card_id: null } }
    expect(resolvePortalTarget(portal, cardsById)).toBeNull()
  })

  it('returns null when target_card_id is not in cardsById', () => {
    const portal = { type: 'portal', config: { target_card_id: 'nonexistent' } }
    expect(resolvePortalTarget(portal, cardsById)).toBeNull()
  })

  it('returns null when config is null', () => {
    const portal = { type: 'portal', config: null }
    expect(resolvePortalTarget(portal, cardsById)).toBeNull()
  })

  it('returns null when portalCard is null', () => {
    expect(resolvePortalTarget(null, cardsById)).toBeNull()
  })

  it('returns null when cardsById is empty', () => {
    const portal = { type: 'portal', config: { target_card_id: 'card-a' } }
    expect(resolvePortalTarget(portal, {})).toBeNull()
  })
})
