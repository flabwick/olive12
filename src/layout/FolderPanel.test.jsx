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
  it('shows shelf empty state by default', () => {
    render(<FolderPanel {...baseProps} />)
    expect(screen.getByText('Nothing in your inbox yet.')).toBeInTheDocument()
  })

  it('shows shelf card titles when provided', () => {
    const shelfEntries = [{ id: 's1', title: 'My Card', body: '', location: 'shelf' }]
    render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} />)
    expect(screen.getByText('My Card')).toBeInTheDocument()
  })

  it('shows shelf tabs when provided', () => {
    const shelfTabs = [{ id: 't1', name: 'Research', savedLocation: 'shelf' }]
    render(<FolderPanel {...baseProps} shelfTabs={shelfTabs} />)
    expect(screen.getByText('Research')).toBeInTheDocument()
  })

  it('shows library view when activeTab is library', () => {
    render(<FolderPanel {...baseProps} activeTab="library" />)
    expect(screen.getByText('Nothing in your vault yet.')).toBeInTheDocument()
  })

  it('shows brain feed when activeTab is brain', () => {
    render(<FolderPanel {...baseProps} activeTab="brain" />)
    expect(screen.getByText('No issues found.')).toBeInTheDocument()
  })

  it('opens on the initialTab when provided', () => {
    render(<FolderPanel {...baseProps} initialTab="library" />)
    expect(screen.getByText('Nothing in your vault yet.')).toBeInTheDocument()
  })

  it('activeTab prop overrides initialTab', () => {
    render(<FolderPanel {...baseProps} initialTab="shelf" activeTab="library" />)
    expect(screen.getByText('Nothing in your vault yet.')).toBeInTheDocument()
  })

  it('highlights the matching shelf card', () => {
    const shelfEntries = [{ id: 's1', title: 'Target card', body: '', location: 'shelf' }]
    render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} highlightedCardId="s1" />)
    expect(document.querySelector('.vault-item-row--highlighted')).toBeTruthy()
  })

  it('does not highlight a shelf card when id does not match', () => {
    const shelfEntries = [{ id: 's1', title: 'Not highlighted', body: '', location: 'shelf' }]
    render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} highlightedCardId="other-id" />)
    expect(document.querySelector('.vault-item-row--highlighted')).toBeNull()
  })

  describe('vault item selection', () => {
    it('calls onSelectVaultItem with card and type when a shelf card is clicked', async () => {
      const onSelectVaultItem = vi.fn()
      const shelfEntries = [{ id: 's1', title: 'My Card', body: '', location: 'shelf' }]
      render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} onSelectVaultItem={onSelectVaultItem} />)
      await userEvent.click(screen.getByText('My Card'))
      expect(onSelectVaultItem).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }), 'card')
    })

    it('does not navigate away from list when a card is clicked', async () => {
      const shelfEntries = [{ id: 's1', title: 'My Card', body: '', location: 'shelf' }]
      render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} onSelectVaultItem={vi.fn()} />)
      await userEvent.click(screen.getByText('My Card'))
      expect(screen.getByText('My Card')).toBeInTheDocument()
    })

    it('calls onSelectVaultItem with tab when a shelf tab is clicked', async () => {
      const onSelectVaultItem = vi.fn()
      const shelfTabs = [{ id: 't1', name: 'Research', savedLocation: 'shelf' }]
      render(<FolderPanel {...baseProps} shelfTabs={shelfTabs} onSelectVaultItem={onSelectVaultItem} />)
      await userEvent.click(screen.getByText('Research'))
      expect(onSelectVaultItem).toHaveBeenCalledWith(expect.objectContaining({ id: 't1' }), 'tab')
    })

    it('calls onSelectVaultItem with folder when a folder name is clicked in library tab', async () => {
      const onSelectVaultItem = vi.fn()
      const folders = [{ id: 'f1', name: 'Work', parentId: null }]
      render(
        <FolderPanel
          {...baseProps}
          folders={folders}
          initialTab="library"
          onSelectVaultItem={onSelectVaultItem}
        />,
      )
      await userEvent.click(screen.getByText('Work'))
      expect(onSelectVaultItem).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'f1', name: 'Work' }),
        'folder',
      )
    })

    it('applies vault-item-row--active class when activeVaultItemId matches a shelf card', () => {
      const shelfEntries = [{ id: 's1', title: 'Active Card', body: '', location: 'shelf' }]
      render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} activeVaultItemId="s1" />)
      expect(document.querySelector('.vault-item-row--active')).toBeTruthy()
    })

    it('does not apply vault-item-row--active when activeVaultItemId does not match', () => {
      const shelfEntries = [{ id: 's1', title: 'My Card', body: '', location: 'shelf' }]
      render(<FolderPanel {...baseProps} shelfEntries={shelfEntries} activeVaultItemId="other" />)
      expect(document.querySelector('.vault-item-row--active')).toBeNull()
    })
  })

  describe('library view', () => {
    it('shows library cards when in library tab', () => {
      const libraryEntries = [{ id: 'l1', title: 'Library card', body: '', location: 'library', folderId: null }]
      render(<FolderPanel {...baseProps} libraryEntries={libraryEntries} initialTab="library" />)
      expect(screen.getByText('Library card')).toBeInTheDocument()
    })

    it('shows folder names in library view', () => {
      const folders = [{ id: 'f1', name: 'Work', parentId: null }]
      render(<FolderPanel {...baseProps} folders={folders} initialTab="library" />)
      expect(screen.getByText('Work')).toBeInTheDocument()
    })

  })

  describe('pick folder mode', () => {
    it('calls onFolderPicked when a folder is clicked in pickFolderMode', async () => {
      const onFolderPicked = vi.fn()
      const folders = [{ id: 'f1', name: 'Work', parentId: null }]
      render(
        <FolderPanel
          {...baseProps}
          folders={folders}
          initialTab="library"
          pickFolderMode
          onFolderPicked={onFolderPicked}
        />,
      )
      await userEvent.click(screen.getByText('Work'))
      expect(onFolderPicked).toHaveBeenCalledWith(expect.objectContaining({ id: 'f1' }))
    })

    it('does not call onSelectVaultItem for card clicks in pickFolderMode', async () => {
      const onSelectVaultItem = vi.fn()
      const libraryEntries = [{ id: 'l1', title: 'My Card', body: '', location: 'library', folderId: null }]
      render(
        <FolderPanel
          {...baseProps}
          libraryEntries={libraryEntries}
          initialTab="library"
          pickFolderMode
          onSelectVaultItem={onSelectVaultItem}
        />,
      )
      await userEvent.click(screen.getByText('My Card'))
      expect(onSelectVaultItem).not.toHaveBeenCalled()
    })
  })

  describe('selection mode', () => {
    it('does not show SelectionToolbar initially', () => {
      render(<FolderPanel {...baseProps} />)
      expect(screen.queryByRole('toolbar', { name: 'Selection actions' })).not.toBeInTheDocument()
    })
  })
})
