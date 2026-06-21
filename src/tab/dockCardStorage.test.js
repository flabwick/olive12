import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/vaultDb'
import { addDockCard, getAllDockCards, getDockCardIds, removeDockCard } from './dockCardStorage'

beforeEach(async () => {
  await db.dock_cards.clear()
})

afterEach(async () => {
  await db.dock_cards.clear()
})

describe('getAllDockCards', () => {
  it('returns empty array when table is empty', async () => {
    expect(await getAllDockCards()).toEqual([])
  })

  it('returns records sorted by order ascending', async () => {
    await db.dock_cards.put({ cardId: 'c2', order: 1 })
    await db.dock_cards.put({ cardId: 'c1', order: 0 })
    const result = await getAllDockCards()
    expect(result.map((r) => r.cardId)).toEqual(['c1', 'c2'])
  })
})

describe('addDockCard', () => {
  it('inserts a record; getAllDockCards returns it', async () => {
    await addDockCard('card-1')
    const all = await getAllDockCards()
    expect(all).toHaveLength(1)
    expect(all[0].cardId).toBe('card-1')
  })

  it('duplicate guard: adding the same cardId twice leaves only one record', async () => {
    await addDockCard('card-1')
    await addDockCard('card-1')
    expect(await getAllDockCards()).toHaveLength(1)
  })

  it('second card gets a higher order than the first', async () => {
    await addDockCard('card-1')
    await addDockCard('card-2')
    const all = await getAllDockCards()
    expect(all[0].cardId).toBe('card-1')
    expect(all[1].cardId).toBe('card-2')
    expect(all[1].order).toBeGreaterThan(all[0].order)
  })
})

describe('removeDockCard', () => {
  it('removes the correct record; others are unaffected', async () => {
    await addDockCard('card-1')
    await addDockCard('card-2')
    await removeDockCard('card-1')
    const all = await getAllDockCards()
    expect(all).toHaveLength(1)
    expect(all[0].cardId).toBe('card-2')
  })

  it('is a no-op when cardId does not exist', async () => {
    await expect(removeDockCard('nonexistent')).resolves.toBeUndefined()
  })
})

describe('getDockCardIds', () => {
  it('returns ids in order, not full records', async () => {
    await addDockCard('card-a')
    await addDockCard('card-b')
    const ids = await getDockCardIds()
    expect(ids).toEqual(['card-a', 'card-b'])
  })
})
