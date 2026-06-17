import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VaultView } from './VaultView'

const shelfCard = {
  id: 's1', title: 'Shelf Card', body: 'Shelf body', type: 'text',
  location: 'shelf', createdAt: 1, updatedAt: 1,
}

const libraryCard = {
  id: 'l1', title: 'Library Card', body: 'Library body', type: 'text',
  location: 'library', folderId: null, createdAt: 2, updatedAt: 2,
}

const baseProps = {
  onChangeView: () => {},
  shelfEntries: [],
  libraryEntries: [],
}

describe('VaultView', () => {
  it('renders Shelf and Library view buttons', () => {
    render(<VaultView {...baseProps} view="shelf" />)
    expect(screen.getByRole('tab', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument()
  })

  it('marks the active view with aria-selected', () => {
    render(<VaultView {...baseProps} view="library" />)
    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Shelf' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChangeView with "shelf" when Shelf is clicked', async () => {
    const onChangeView = vi.fn()
    render(<VaultView {...baseProps} view="library" onChangeView={onChangeView} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Shelf' }))
    expect(onChangeView).toHaveBeenCalledWith('shelf')
  })

  it('calls onChangeView with "library" when Library is clicked', async () => {
    const onChangeView = vi.fn()
    render(<VaultView {...baseProps} view="shelf" onChangeView={onChangeView} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
    expect(onChangeView).toHaveBeenCalledWith('library')
  })

  describe('shelf view', () => {
    it('shows shelf entries when view is "shelf"', () => {
      render(<VaultView {...baseProps} view="shelf" shelfEntries={[shelfCard]} />)
      expect(screen.getByText('Shelf Card')).toBeInTheDocument()
    })

    it('does not show library cards in shelf view', () => {
      render(
        <VaultView
          {...baseProps}
          view="shelf"
          shelfEntries={[shelfCard]}
          libraryEntries={[libraryCard]}
        />,
      )
      expect(screen.queryByText('Library Card')).not.toBeInTheDocument()
    })

    it('shows empty state message when shelf is empty', () => {
      render(<VaultView {...baseProps} view="shelf" />)
      expect(
        screen.getByText('Shelf is empty. Save some cards from your tab.'),
      ).toBeInTheDocument()
    })

    it('shows Move to Library button for shelf cards when onMoveToLibrary is provided', () => {
      render(
        <VaultView
          {...baseProps}
          view="shelf"
          shelfEntries={[shelfCard]}
          onMoveToLibrary={() => {}}
        />,
      )
      expect(screen.getByRole('button', { name: 'Move to Library' })).toBeInTheDocument()
    })

    it('calls onMoveToLibrary with cardId and null when Move to Library is clicked', async () => {
      const onMoveToLibrary = vi.fn()
      render(
        <VaultView
          {...baseProps}
          view="shelf"
          shelfEntries={[shelfCard]}
          onMoveToLibrary={onMoveToLibrary}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
      expect(onMoveToLibrary).toHaveBeenCalledWith('s1', null)
    })
  })

  describe('library view', () => {
    it('shows library entries when view is "library"', () => {
      render(
        <VaultView
          {...baseProps}
          view="library"
          libraryEntries={[libraryCard]}
        />,
      )
      expect(screen.getByText('Library Card')).toBeInTheDocument()
    })

    it('renders the library folder tree when view is library', () => {
      render(<VaultView {...baseProps} view="library" />)
      expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
    })

    it('does not show shelf entries in library view', () => {
      render(
        <VaultView
          {...baseProps}
          view="library"
          shelfEntries={[shelfCard]}
          libraryEntries={[libraryCard]}
        />,
      )
      expect(screen.queryByText('Shelf Card')).not.toBeInTheDocument()
    })
  })
})
