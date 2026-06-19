import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { createCard } from './createCard'
import { deleteCard, getAllCards, getDirtyCards, markCardClean, putCard } from './cardStorage'

describe('cardStorage', () => {
  beforeEach(async () => {
    await db.cards.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty array when no cards are stored', async () => {
    expect(await getAllCards()).toEqual([])
  })

  it('putCard stores a card and getAllCards retrieves it', async () => {
    const card = createCard({ title: 'Notes', body: 'Buy milk' })
    await putCard(card)
    const cards = await getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0]).toMatchObject({ id: 'test-uuid', title: 'Notes', body: 'Buy milk' })
  })

  it('putCard always sets dirty: true', async () => {
    const card = createCard({ title: 'A', body: 'B' })
    await putCard(card)
    const cards = await getAllCards()
    expect(cards[0].dirty).toBe(true)
  })

  it('putCard updates an existing card without creating a duplicate', async () => {
    const card = createCard({ title: 'Old', body: 'B' })
    await putCard(card)
    await putCard({ ...card, title: 'New' })
    const cards = await getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].title).toBe('New')
  })

  it('deleteCard removes the card', async () => {
    const card = createCard({ title: 'A', body: 'B' })
    await putCard(card)
    await deleteCard(card.id)
    expect(await getAllCards()).toEqual([])
  })

  it('putCard round-trips the location field', async () => {
    const card = { ...createCard({ title: 'A', body: 'B' }), location: 'shelf' }
    await putCard(card)
    const cards = await getAllCards()
    expect(cards[0].location).toBe('shelf')
  })

  it('putCard preserves updated location on upsert', async () => {
    const card = createCard({ title: 'A', body: 'B' })
    await putCard(card)
    await putCard({ ...card, location: 'library' })
    const cards = await getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].location).toBe('library')
  })

  it('getDirtyCards returns only cards with dirty: true', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('card-a').mockReturnValueOnce('card-b')
    const cardA = createCard({ title: 'A', body: '' })
    const cardB = createCard({ title: 'B', body: '' })
    await putCard(cardA)  // dirty: true
    await db.cards.put({ ...cardB, dirty: false })  // explicitly clean
    const dirty = await getDirtyCards()
    expect(dirty).toHaveLength(1)
    expect(dirty[0].title).toBe('A')
  })

  it('getDirtyCards returns empty array when no cards are dirty', async () => {
    const card = createCard({ title: 'A', body: '' })
    await db.cards.put({ ...card, dirty: false })
    expect(await getDirtyCards()).toEqual([])
  })

  it('markCardClean writes the card with dirty: false', async () => {
    const card = createCard({ title: 'A', body: 'original' })
    await putCard(card)
    const merged = { ...card, title: 'Updated' }
    await markCardClean(card.id, merged)
    const cards = await getAllCards()
    expect(cards).toHaveLength(1)
    expect(cards[0].dirty).toBe(false)
    expect(cards[0].title).toBe('Updated')
  })

  it('markCardClean forces dirty: false even if mergedCard has dirty: true', async () => {
    const card = createCard({ title: 'A', body: '' })
    await putCard(card)
    await markCardClean(card.id, { ...card, dirty: true })
    const cards = await getAllCards()
    expect(cards[0].dirty).toBe(false)
  })

  it('putCard round-trips portal card config.target_card_id', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('portal-uuid')
    const card = createCard({ type: 'portal', config: { target_card_id: 'target-123' } })
    await putCard(card)
    const cards = await getAllCards()
    expect(cards[0].type).toBe('portal')
    expect(cards[0].config.target_card_id).toBe('target-123')
  })
})
