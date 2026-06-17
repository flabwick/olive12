import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FolderTree } from './FolderTree'

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
  { id: 'f2', name: 'Personal', parentId: null, createdAt: 2, updatedAt: 2 },
  { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
]

const cards = [
  { id: 'c1', title: 'Root card', folderId: null },
  { id: 'c2', title: 'Work card', folderId: 'f1' },
  { id: 'c3', title: 'Projects card', folderId: 'f3' },
]

describe('FolderTree', () => {
  it('renders the library tree root', () => {
    render(<FolderTree />)
    expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
  })

  it('renders folder names', () => {
    render(<FolderTree folders={folders} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
  })

  it('renders nested folder', () => {
    render(<FolderTree folders={folders} />)
    expect(screen.getByText('Projects')).toBeInTheDocument()
  })

  it('renders cards in their folder', () => {
    render(<FolderTree folders={folders} cards={cards} />)
    expect(screen.getByText('Work card')).toBeInTheDocument()
    expect(screen.getByText('Projects card')).toBeInTheDocument()
  })

  it('renders root-level cards (folderId null)', () => {
    render(<FolderTree folders={[]} cards={[{ id: 'c1', title: 'Root card', folderId: null }]} />)
    expect(screen.getByText('Root card')).toBeInTheDocument()
  })

  it('folders are expanded by default', () => {
    render(<FolderTree folders={folders} cards={cards} />)
    expect(screen.getByText('Work card')).toBeVisible()
  })

  it('clicking a folder toggle collapses it', async () => {
    render(<FolderTree folders={[{ id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }]} cards={[{ id: 'c1', title: 'Work card', folderId: 'f1' }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Work' }))
    expect(screen.queryByText('Work card')).not.toBeInTheDocument()
  })

  it('clicking a collapsed folder expands it', async () => {
    render(<FolderTree folders={[{ id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }]} cards={[{ id: 'c1', title: 'Work card', folderId: 'f1' }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse Work' }))
    await userEvent.click(screen.getByRole('button', { name: 'Expand Work' }))
    expect(screen.getByText('Work card')).toBeInTheDocument()
  })

  it('renders New folder button when onCreateFolder is provided', () => {
    render(<FolderTree onCreateFolder={() => {}} />)
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument()
  })

  it('clicking New folder calls onCreateFolder with parentId null', async () => {
    const onCreateFolder = vi.fn()
    render(<FolderTree onCreateFolder={onCreateFolder} />)
    await userEvent.click(screen.getByRole('button', { name: 'New folder' }))
    expect(onCreateFolder).toHaveBeenCalledWith({ parentId: null })
  })

  it('renders New folder in subfolder button when onCreateFolder is provided', () => {
    render(<FolderTree folders={[{ id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }]} onCreateFolder={() => {}} />)
    expect(screen.getByRole('button', { name: 'New folder in Work' })).toBeInTheDocument()
  })

  it('clicking New folder in subfolder calls onCreateFolder with parentId', async () => {
    const onCreateFolder = vi.fn()
    render(<FolderTree folders={[{ id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 }]} onCreateFolder={onCreateFolder} />)
    await userEvent.click(screen.getByRole('button', { name: 'New folder in Work' }))
    expect(onCreateFolder).toHaveBeenCalledWith({ parentId: 'f1' })
  })

  it('renders nothing when folders and cards are empty', () => {
    render(<FolderTree folders={[]} cards={[]} />)
    expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
