import { describe, expect, it } from 'vitest'
import { isCardOnTab, isOrphanTabCandidate } from './tabVaultLogic'

describe('tabVaultLogic', () => {
  const cardsById = {
    'text-1': { id: 'text-1', type: 'text', location: 'none' },
    'vault-1': { id: 'vault-1', type: 'text', location: 'shelf' },
    'portal-1': { id: 'portal-1', type: 'portal', config: { target_card_id: 'vault-1' } },
  }

  it('isCardOnTab is true for a direct tab_card', () => {
    const tabCards = [{ tabId: 'tab-a', cardId: 'text-1', position: 0 }]
    expect(isCardOnTab('text-1', tabCards, cardsById)).toBe(true)
  })

  it('isCardOnTab is true when a portal on the tab points at the card', () => {
    const tabCards = [{ tabId: 'tab-a', cardId: 'portal-1', position: 0 }]
    expect(isCardOnTab('vault-1', tabCards, cardsById)).toBe(true)
  })

  it('isOrphanTabCandidate rejects vault cards', () => {
    const tabCards = [{ tabId: 'tab-a', cardId: 'portal-1', position: 0 }]
    expect(isOrphanTabCandidate(cardsById['vault-1'], tabCards, cardsById)).toBe(false)
  })

  it('isOrphanTabCandidate accepts unsaved drafts not on any tab', () => {
    expect(isOrphanTabCandidate(cardsById['text-1'], [], cardsById)).toBe(true)
  })

  it('isOrphanTabCandidate rejects library cards', () => {
    const libraryCard = { id: 'lib-1', type: 'text', location: 'library' }
    expect(isOrphanTabCandidate(libraryCard, [], cardsById)).toBe(false)
  })

  it('isOrphanTabCandidate rejects portal cards', () => {
    expect(isOrphanTabCandidate(cardsById['portal-1'], [], cardsById)).toBe(false)
  })

  it('isCardOnTab is false when the card is only in vault storage', () => {
    expect(isCardOnTab('vault-1', [], cardsById)).toBe(false)
  })

  it('isCardOnTab is false when a different portal targets another card', () => {
    const otherPortal = { id: 'portal-2', type: 'portal', config: { target_card_id: 'text-1' } }
    const cards = { ...cardsById, 'portal-2': otherPortal }
    const tabCards = [{ tabId: 'tab-a', cardId: 'portal-2', position: 0 }]
    expect(isCardOnTab('vault-1', tabCards, cards)).toBe(false)
  })
})
