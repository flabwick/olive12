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

  it('calls onOpenAsPortal with card id when Open in tab is clicked on a shelf row', async () => {
    const onOpenAsPortal = vi.fn()
    const shelfEntries = [{ id: 's1', title: 'My Card', type: 'note', createdAt: Date.now() }]
    render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} onOpenAsPortal={onOpenAsPortal} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open in tab' }))
    expect(onOpenAsPortal).toHaveBeenCalledWith('s1')
  })

  it('calls onOpenAsPortal with card id when Open in tab is clicked on a library card', async () => {
    const onOpenAsPortal = vi.fn()
    const libraryEntries = [{ id: 'l1', title: 'Library card', type: 'text', folderId: null }]
    render(<FolderPanel {...baseProps} libraryEntries={libraryEntries} onOpenAsPortal={onOpenAsPortal} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Open Library card in tab' }))
    expect(onOpenAsPortal).toHaveBeenCalledWith('l1')
  })

  describe('locate highlight', () => {
    it('opens on the initialTab when provided', () => {
      render(<FolderPanel {...baseProps} initialTab="library" />)
      expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
    })

    it('highlights the matching shelf row when highlightedCardId is set', () => {
      const shelfEntries = [{ id: 's1', title: 'Target card', type: 'text', createdAt: Date.now() }]
      render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} highlightedCardId="s1" />)
      const row = screen.getByRole('listitem')
      expect(row).toHaveClass('shelf-row--highlighted')
    })

    it('does not highlight a shelf row when its id does not match highlightedCardId', () => {
      const shelfEntries = [{ id: 's1', title: 'Not highlighted', type: 'text', createdAt: Date.now() }]
      render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} highlightedCardId="other-id" />)
      expect(screen.getByRole('listitem')).not.toHaveClass('shelf-row--highlighted')
    })
  })

  describe('saved tabs in vault', () => {
    const shelfTab = {
      id: 'tab-1',
      name: 'My research',
      savedLocation: 'shelf',
      createdAt: new Date('2024-03-15').getTime(),
    }

    it('shows shelf tab row when shelfTabs is provided', () => {
      render(<FolderPanel {...baseProps} shelfTabs={[shelfTab]} />)
      expect(screen.getByText('My research')).toBeInTheDocument()
    })

    it('shelf empty state hidden when shelfTabs has entries even if shelfEntries is empty', () => {
      render(<FolderPanel {...baseProps} shelfTabs={[shelfTab]} />)
      expect(screen.queryByText(/Shelf is empty/)).not.toBeInTheDocument()
    })

    it('calls onOpenTab with tab id when Switch to tab is clicked', async () => {
      const onOpenTab = vi.fn()
      render(<FolderPanel {...baseProps} shelfTabs={[shelfTab]} onOpenTab={onOpenTab} />)
      await userEvent.click(screen.getByRole('button', { name: 'Switch to tab' }))
      expect(onOpenTab).toHaveBeenCalledWith('tab-1')
    })

    it('calls onMoveTabToLibrary with tab id when Move to Library is clicked on a shelf tab', async () => {
      const onMoveTabToLibrary = vi.fn()
      render(<FolderPanel {...baseProps} shelfTabs={[shelfTab]} onMoveTabToLibrary={onMoveTabToLibrary} />)
      await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
      expect(onMoveTabToLibrary).toHaveBeenCalledWith('tab-1')
    })

    it('shows library tab row in Library view when libraryTabs is provided', async () => {
      const libraryTab = { ...shelfTab, id: 'tab-2', name: 'Archive tab', savedLocation: 'library' }
      render(<FolderPanel {...baseProps} libraryTabs={[libraryTab]} />)
      await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
      expect(screen.getByText('Archive tab')).toBeInTheDocument()
    })

    it('calls onOpenTab with tab id when Switch to tab is clicked in Library view', async () => {
      const onOpenTab = vi.fn()
      const libraryTab = { ...shelfTab, id: 'tab-2', name: 'Archive tab', savedLocation: 'library' }
      render(<FolderPanel {...baseProps} libraryTabs={[libraryTab]} onOpenTab={onOpenTab} />)
      await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
      await userEvent.click(screen.getByRole('button', { name: 'Switch to tab' }))
      expect(onOpenTab).toHaveBeenCalledWith('tab-2')
    })
  })
})
