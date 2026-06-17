import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { createCard } from './createCard'
import { deleteCard, getAllCards, putCard } from './cardStorage'

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
})
