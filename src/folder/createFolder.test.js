import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildFolderTree,
  collectDescendantIds,
  createFolder,
  flattenFolderTree,
  isFolderDescendant,
} from './createFolder'

describe('createFolder', () => {
  beforeEach(() => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('folder-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a folder with default name and null parentId', () => {
    expect(createFolder()).toEqual({
      id: 'folder-uuid',
      name: 'New folder',
      parentId: null,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_000_000,
    })
  })

  it('accepts a custom name and parentId', () => {
    const f = createFolder({ name: 'Work', parentId: 'parent-id' })
    expect(f.name).toBe('Work')
    expect(f.parentId).toBe('parent-id')
  })

  it('assigns a unique id to each folder', () => {
    vi.restoreAllMocks()
    const a = createFolder()
    const b = createFolder()
    expect(a.id).not.toBe(b.id)
  })
})

describe('buildFolderTree', () => {
  const folders = [
    { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
    { id: 'f2', name: 'Archive', parentId: null, createdAt: 2, updatedAt: 2 },
    { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
    { id: 'f4', name: 'Personal', parentId: 'f1', createdAt: 4, updatedAt: 4 },
  ]

  it('returns empty array for no folders', () => {
    expect(buildFolderTree([])).toEqual([])
  })

  it('returns root folders sorted alphabetically', () => {
    const tree = buildFolderTree(folders)
    expect(tree).toHaveLength(2)
    expect(tree[0].id).toBe('f2') // Archive before Work
    expect(tree[1].id).toBe('f1')
  })

  it('nests children under parent folder', () => {
    const tree = buildFolderTree(folders)
    const work = tree.find((n) => n.id === 'f1')
    expect(work.children).toHaveLength(2)
    expect(work.children.map((c) => c.id)).toContain('f3')
    expect(work.children.map((c) => c.id)).toContain('f4')
  })

  it('root with no children has empty children array', () => {
    const tree = buildFolderTree(folders)
    const archive = tree.find((n) => n.id === 'f2')
    expect(archive.children).toEqual([])
  })
})

describe('flattenFolderTree', () => {
  const folders = [
    { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
    { id: 'f2', name: 'Notes', parentId: null, createdAt: 2, updatedAt: 2 },
    { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
  ]

  it('returns empty array for no folders', () => {
    expect(flattenFolderTree([])).toEqual([])
  })

  it('returns flat list with depth information', () => {
    const flat = flattenFolderTree(folders)
    expect(flat).toHaveLength(3)
    const work = flat.find((item) => item.folder.id === 'f1')
    const projects = flat.find((item) => item.folder.id === 'f3')
    expect(work.depth).toBe(0)
    expect(projects.depth).toBe(1)
  })

  it('places children after their parent in the list', () => {
    const flat = flattenFolderTree(folders)
    const workIndex = flat.findIndex((item) => item.folder.id === 'f1')
    const projectsIndex = flat.findIndex((item) => item.folder.id === 'f3')
    expect(projectsIndex).toBe(workIndex + 1)
  })
})

describe('collectDescendantIds', () => {
  const folders = [
    { id: 'f1', name: 'Root', parentId: null },
    { id: 'f2', name: 'Child', parentId: 'f1' },
    { id: 'f3', name: 'Grandchild', parentId: 'f2' },
    { id: 'f4', name: 'Sibling', parentId: 'f1' },
    { id: 'f5', name: 'Other root', parentId: null },
  ]

  it('returns empty array for a leaf folder', () => {
    expect(collectDescendantIds(folders, 'f3')).toEqual([])
  })

  it('returns direct children for a folder with only immediate children', () => {
    const ids = collectDescendantIds(folders, 'f2')
    expect(ids).toEqual(['f3'])
  })

  it('returns all transitive descendants', () => {
    const ids = collectDescendantIds(folders, 'f1')
    expect(ids).toContain('f2')
    expect(ids).toContain('f3')
    expect(ids).toContain('f4')
    expect(ids).not.toContain('f5')
    expect(ids).not.toContain('f1')
  })

  it('returns empty array for non-existent folderId', () => {
    expect(collectDescendantIds(folders, 'nope')).toEqual([])
  })
})

describe('isFolderDescendant', () => {
  const folders = [
    { id: 'f1', name: 'Root', parentId: null },
    { id: 'f2', name: 'Child', parentId: 'f1' },
    { id: 'f3', name: 'Grandchild', parentId: 'f2' },
    { id: 'f4', name: 'Other root', parentId: null },
  ]

  it('returns true when targetId is a direct child', () => {
    expect(isFolderDescendant(folders, 'f1', 'f2')).toBe(true)
  })

  it('returns true when targetId is a grandchild', () => {
    expect(isFolderDescendant(folders, 'f1', 'f3')).toBe(true)
  })

  it('returns false when targetId is not a descendant', () => {
    expect(isFolderDescendant(folders, 'f1', 'f4')).toBe(false)
  })

  it('returns false when folderId === targetId (not its own descendant)', () => {
    expect(isFolderDescendant(folders, 'f1', 'f1')).toBe(false)
  })

  it('returns false when folderId is actually a descendant of targetId', () => {
    expect(isFolderDescendant(folders, 'f3', 'f1')).toBe(false)
  })
})
