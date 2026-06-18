import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FolderPanel } from './FolderPanel'

const baseProps = {
  shelfEntries: [],
  libraryEntries: [],
  folders: [],
  onClose: () => {},
}

describe('FolderPanel', () => {
  it('renders Shelf, Library and Brain tabs', () => {
    render(<FolderPanel {...baseProps} />)
    expect(screen.getByRole('tab', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Brain' })).toBeInTheDocument()
  })

  it('renders a close button', () => {
    render(<FolderPanel {...baseProps} />)
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<FolderPanel {...baseProps} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows shelf empty state by default', () => {
    render(<FolderPanel {...baseProps} />)
    expect(screen.getByText(/Shelf is empty/)).toBeInTheDocument()
  })

  it('shows shelf entries when provided', () => {
    const shelfEntries = [{ id: 's1', title: 'My Card', type: 'note', createdAt: Date.now() }]
    render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} />)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('switches to Library tab and shows folder tree', async () => {
    render(<FolderPanel {...baseProps} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
    expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
  })

  it('switches to Brain tab and shows placeholder', async () => {
    render(<FolderPanel {...baseProps} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Brain' }))
    expect(screen.getByText(/coming soon/)).toBeInTheDocument()
  })

  it('calls onMoveToLibrary with card id and null folderId', async () => {
    const onMoveToLibrary = vi.fn()
    const shelfEntries = [{ id: 's1', title: 'Card', type: 'note', createdAt: Date.now() }]
    render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    expect(onMoveToLibrary).toHaveBeenCalledWith('s1', null)
  })
})
