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
      back: '',
      config: null,
      location: 'none',
      folderId: null,
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
      back: '',
      config: null,
      location: 'none',
      folderId: null,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('creates a portal card with correct type and config', () => {
    expect(createCard({ type: 'portal', config: { target_card_id: 'card-xyz' } })).toEqual({
      id: 'test-uuid',
      type: 'portal',
      title: '',
      body: '',
      back: '',
      config: { target_card_id: 'card-xyz' },
      location: 'none',
      folderId: null,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('default back is empty string', () => {
    expect(createCard().back).toBe('')
  })

  it('accepts a custom back value', () => {
    expect(createCard({ back: 'Answer here' }).back).toBe('Answer here')
  })

  it('defaults location to "none"', () => {
    expect(createCard().location).toBe('none')
  })

  it('defaults folderId to null', () => {
    expect(createCard().folderId).toBeNull()
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
    back: '',
    config: null,
    location: 'none',
    folderId: null,
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

  it('preserves folderId when not provided', () => {
    const card = { ...base, folderId: 'f1' }
    expect(updateCardFields(card, { title: 'T' }).folderId).toBe('f1')
  })

  it('updates folderId', () => {
    expect(updateCardFields(base, { folderId: 'f2' }).folderId).toBe('f2')
  })

  it('does not mutate the original card', () => {
    updateCardFields(base, { title: 'New title', location: 'shelf' })
    expect(base.title).toBe('Old title')
    expect(base.location).toBe('none')
    expect(base.folderId).toBeNull()
  })

  it('stamps updatedAt with Date.now()', () => {
    const result = updateCardFields(base, { title: 'T' })
    expect(result.updatedAt).toBe(1_700_000_001_000)
    expect(result.createdAt).toBe(1_700_000_000_000)
  })

  it('passes config through when not updated', () => {
    const portalBase = { ...base, type: 'portal', config: { target_card_id: 'abc' } }
    const result = updateCardFields(portalBase, { title: 'T' })
    expect(result.config).toEqual({ target_card_id: 'abc' })
  })

  it('updates config when provided', () => {
    const portalBase = { ...base, type: 'portal', config: { target_card_id: 'abc' } }
    const result = updateCardFields(portalBase, { config: { target_card_id: 'xyz' } })
    expect(result.config).toEqual({ target_card_id: 'xyz' })
  })

  it('preserves back when not provided', () => {
    const card = { ...base, back: 'The answer' }
    expect(updateCardFields(card, { title: 'New' }).back).toBe('The answer')
  })

  it('updates back when provided', () => {
    const result = updateCardFields(base, { back: 'New back' })
    expect(result.back).toBe('New back')
  })
})
