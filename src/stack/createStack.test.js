import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createStack, updateStackFields } from './createStack'

describe('createStack', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns default shape with all required fields', () => {
    const stack = createStack()
    expect(stack).toMatchObject({
      type: 'stack',
      title: '',
      body: '',
      back: '',
      location: 'none',
      folderId: null,
      config: { memberIds: [], topCardId: null },
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
    expect(typeof stack.id).toBe('string')
    expect(stack.id.length).toBeGreaterThan(0)
  })

  it('accepts custom title, memberIds, and topCardId', () => {
    const stack = createStack({ title: 'My Stack', memberIds: ['a', 'b'], topCardId: 'b' })
    expect(stack.title).toBe('My Stack')
    expect(stack.config.memberIds).toEqual(['a', 'b'])
    expect(stack.config.topCardId).toBe('b')
  })

  it('id is a non-empty string', () => {
    const stack = createStack()
    expect(typeof stack.id).toBe('string')
    expect(stack.id.length).toBeGreaterThan(0)
  })

  it('two stacks created in sequence have different ids', () => {
    const a = createStack()
    const b = createStack()
    expect(a.id).not.toBe(b.id)
  })

  it('type is always stack', () => {
    expect(createStack().type).toBe('stack')
    expect(createStack({ memberIds: ['a', 'b'] }).type).toBe('stack')
  })

  it('body is always empty string', () => {
    expect(createStack().body).toBe('')
    expect(createStack({ memberIds: ['a', 'b'] }).body).toBe('')
  })

  it('config.topCardId defaults to memberIds[0] when memberIds is non-empty', () => {
    const stack = createStack({ memberIds: ['x', 'y'] })
    expect(stack.config.topCardId).toBe('x')
  })

  it('config.topCardId stays null when memberIds is empty and topCardId not provided', () => {
    const stack = createStack()
    expect(stack.config.topCardId).toBeNull()
  })

  it('throws when memberIds has exactly 1 entry', () => {
    expect(() => createStack({ memberIds: ['only'] })).toThrow()
  })

  it('does not throw when memberIds is empty', () => {
    expect(() => createStack({ memberIds: [] })).not.toThrow()
    expect(() => createStack()).not.toThrow()
  })

  it('throws when topCardId is provided but not in memberIds', () => {
    expect(() => createStack({ memberIds: ['a', 'b'], topCardId: 'c' })).toThrow()
  })

  it('does not throw when topCardId is in memberIds', () => {
    expect(() => createStack({ memberIds: ['a', 'b'], topCardId: 'b' })).not.toThrow()
  })

  it('memberIds array is copied — mutating input does not affect the stack', () => {
    const ids = ['a', 'b']
    const stack = createStack({ memberIds: ids })
    ids.push('c')
    expect(stack.config.memberIds).toEqual(['a', 'b'])
  })
})

describe('updateStackFields', () => {
  let base

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    base = createStack({ title: 'Original', memberIds: ['a', 'b'], topCardId: 'a' })
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_001_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('partial update: only specified fields change, others are unchanged', () => {
    const updated = updateStackFields(base, { title: 'New Title' })
    expect(updated.title).toBe('New Title')
    expect(updated.back).toBe(base.back)
    expect(updated.location).toBe(base.location)
    expect(updated.folderId).toBe(base.folderId)
    expect(updated.config).toEqual(base.config)
    expect(updated.type).toBe('stack')
    expect(updated.body).toBe('')
  })

  it('refreshes updatedAt', () => {
    const updated = updateStackFields(base, { title: 'New' })
    expect(updated.updatedAt).toBe(1_700_000_001_000)
    expect(updated.updatedAt).toBeGreaterThan(base.updatedAt)
  })

  it('merges config shallowly: passing topCardId preserves memberIds', () => {
    const updated = updateStackFields(base, { config: { topCardId: 'b' } })
    expect(updated.config.topCardId).toBe('b')
    expect(updated.config.memberIds).toEqual(base.config.memberIds)
  })

  it('does not allow changing type or body', () => {
    const updated = updateStackFields(base, {})
    expect(updated.type).toBe('stack')
    expect(updated.body).toBe('')
  })

  it('returns a new object and does not mutate input', () => {
    const updated = updateStackFields(base, { title: 'Changed' })
    expect(updated).not.toBe(base)
    expect(base.title).toBe('Original')
  })
})
