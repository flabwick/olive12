import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createCard, updateCardFields } from './createCard'

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
      location: 'none',
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
      location: 'none',
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('defaults location to "none"', () => {
    expect(createCard().location).toBe('none')
  })

  it('assigns a unique id to each card', () => {
    vi.restoreAllMocks()
    const first = createCard()
    const second = createCard()

    expect(first.id).not.toBe(second.id)
  })
})

describe('updateCardFields', () => {
  const base = {
    id: 'x',
    type: 'text',
    title: 'Old title',
    body: 'Old body',
    location: 'none',
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
  }

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_001_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns a new card with updated title and body', () => {
    expect(updateCardFields(base, { title: 'New title', body: 'New body' })).toEqual({
      ...base,
      title: 'New title',
      body: 'New body',
      updatedAt: 1_700_000_001_000,
    })
  })

  it('preserves body when only title is updated', () => {
    const result = updateCardFields(base, { title: 'New title' })
    expect(result.body).toBe('Old body')
  })

  it('preserves title when only body is updated', () => {
    const result = updateCardFields(base, { body: 'New body' })
    expect(result.title).toBe('Old title')
  })

  it('preserves location when not provided', () => {
    const shelfCard = { ...base, location: 'shelf' }
    expect(updateCardFields(shelfCard, { title: 'New' }).location).toBe('shelf')
  })

  it('updates location to "shelf"', () => {
    expect(updateCardFields(base, { location: 'shelf' }).location).toBe('shelf')
  })

  it('updates location from "shelf" to "library"', () => {
    const shelfCard = { ...base, location: 'shelf' }
    expect(updateCardFields(shelfCard, { location: 'library' }).location).toBe('library')
  })

  it('does not mutate the original card', () => {
    updateCardFields(base, { title: 'New title', location: 'shelf' })
    expect(base.title).toBe('Old title')
    expect(base.location).toBe('none')
  })

  it('stamps updatedAt with Date.now()', () => {
    const result = updateCardFields(base, { title: 'T' })
    expect(result.updatedAt).toBe(1_700_000_001_000)
    expect(result.createdAt).toBe(1_700_000_000_000)
  })
})
