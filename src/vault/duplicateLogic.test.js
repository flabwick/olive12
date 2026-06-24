import { describe, expect, it } from 'vitest'
import { findDuplicateCard, findDuplicateFolder } from './duplicateLogic'

const folder = (id, name, parentId = null) => ({ id, name, parentId })
const card = (id, title, folderId = null) => ({ id, title, folderId })

describe('findDuplicateFolder', () => {
  const folders = [
    folder('a', 'Notes', null),
    folder('b', 'Work', null),
    folder('c', 'Work', 'a'),
  ]

  it('returns null when no folders', () => {
    expect(findDuplicateFolder([], 'Notes', null)).toBeNull()
  })

  it('finds a match by name and parentId', () => {
    expect(findDuplicateFolder(folders, 'Work', null)?.id).toBe('b')
  })

  it('distinguishes by parentId — same name under different parents is not a duplicate', () => {
    expect(findDuplicateFolder(folders, 'Notes', 'a')).toBeNull()
  })

  it('finds match under non-root parent', () => {
    expect(findDuplicateFolder(folders, 'Work', 'a')?.id).toBe('c')
  })

  it('excludes self so renaming to same name is not a conflict', () => {
    expect(findDuplicateFolder(folders, 'Work', null, 'b')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(findDuplicateFolder(folders, 'NOTES', null)?.id).toBe('a')
    expect(findDuplicateFolder(folders, 'notes', null)?.id).toBe('a')
  })
})

describe('findDuplicateCard', () => {
  const cards = [
    card('x', 'Meeting notes', null),
    card('y', 'Meeting notes', 'f1'),
    card('z', 'Sprint plan', 'f1'),
  ]

  it('returns null when no cards', () => {
    expect(findDuplicateCard([], 'foo', null)).toBeNull()
  })

  it('finds a match by title and folderId', () => {
    expect(findDuplicateCard(cards, 'Meeting notes', 'f1')?.id).toBe('y')
  })

  it('distinguishes by folderId', () => {
    expect(findDuplicateCard(cards, 'Meeting notes', null)?.id).toBe('x')
    expect(findDuplicateCard(cards, 'Meeting notes', 'f2')).toBeNull()
  })

  it('excludes self', () => {
    expect(findDuplicateCard(cards, 'Meeting notes', 'f1', 'y')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(findDuplicateCard(cards, 'SPRINT PLAN', 'f1')?.id).toBe('z')
  })
})
