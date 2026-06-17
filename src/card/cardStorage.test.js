import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCard } from './createCard'
import { loadCards, saveCards } from './cardStorage'

describe('cardStorage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an empty array when nothing is stored', () => {
    expect(loadCards()).toEqual([])
  })

  it('persists and reloads a card created with createCard', () => {
    const card = createCard({ title: 'Notes', body: 'Buy milk' })

    saveCards([card])

    expect(loadCards()).toEqual([card])
  })

  it('returns an empty array when stored data is invalid', () => {
    localStorage.setItem('olive12:cards', 'not-json')

    expect(loadCards()).toEqual([])
  })

  it('returns an empty array when stored data is not an array', () => {
    localStorage.setItem('olive12:cards', JSON.stringify({ id: 'nope' }))

    expect(loadCards()).toEqual([])
  })
})
