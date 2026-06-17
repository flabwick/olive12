import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCard } from './createCard'

describe('createCard', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a card with default title and body', () => {
    expect(createCard()).toEqual({
      id: 'test-uuid',
      type: 'text',
      title: '',
      body: '',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('creates a card with the provided title and body', () => {
    expect(createCard({ title: 'Notes', body: 'Buy milk' })).toEqual({
      id: 'test-uuid',
      type: 'text',
      title: 'Notes',
      body: 'Buy milk',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('assigns a unique id to each card', () => {
    vi.restoreAllMocks()
    const first = createCard()
    const second = createCard()

    expect(first.id).not.toBe(second.id)
  })
})
