import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VaultView } from './VaultView'

const makeTabEntry = (overrides = {}) => ({
  card: { id: 'c1', title: 'Tab Card', body: 'Tab body', type: 'text', location: 'none' },
  position: 0,
  foldState: false,
  hiddenState: false,
  ...overrides,
})

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
  tabEntries: [],
  shelfEntries: [],
  libraryEntries: [],
}

describe('VaultView', () => {
  it('renders three view buttons', () => {
    render(<VaultView {...baseProps} view="tab" />)
    expect(screen.getByRole('tab', { name: 'Tab' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument()
  })

  it('marks the active view button with aria-selected', () => {
    render(<VaultView {...baseProps} view="shelf" />)
    expect(screen.getByRole('tab', { name: 'Shelf' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Tab' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Library' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChangeView with "shelf" when Shelf is clicked', async () => {
    const onChangeView = vi.fn()
    render(<VaultView {...baseProps} view="tab" onChangeView={onChangeView} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Shelf' }))
    expect(onChangeView).toHaveBeenCalledWith('shelf')
  })

  it('calls onChangeView with "library" when Library is clicked', async () => {
    const onChangeView = vi.fn()
    render(<VaultView {...baseProps} view="tab" onChangeView={onChangeView} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
    expect(onChangeView).toHaveBeenCalledWith('library')
  })

  it('calls onChangeView with "tab" when Tab is clicked', async () => {
    const onChangeView = vi.fn()
    render(<VaultView {...baseProps} view="shelf" onChangeView={onChangeView} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Tab' }))
    expect(onChangeView).toHaveBeenCalledWith('tab')
  })

  describe('tab view', () => {
    it('shows tab entries when view is "tab"', () => {
      render(<VaultView {...baseProps} view="tab" tabEntries={[makeTabEntry()]} />)
      expect(screen.getByText('Tab Card')).toBeInTheDocument()
    })

    it('does not show shelf or library content when view is "tab"', () => {
      render(
        <VaultView
          {...baseProps}
          view="tab"
          shelfEntries={[shelfCard]}
          libraryEntries={[libraryCard]}
        />,
      )
      expect(screen.queryByText('Shelf Card')).not.toBeInTheDocument()
      expect(screen.queryByText('Library Card')).not.toBeInTheDocument()
    })

    it('renders the Dock Add card button', () => {
      render(<VaultView {...baseProps} view="tab" onAddCard={() => {}} />)
      expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
    })

    it('clicking Add card opens the TransientCard form', async () => {
      render(<VaultView {...baseProps} view="tab" onAddCard={() => {}} />)
      await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
      expect(screen.getByLabelText('Title')).toBeInTheDocument()
    })

    it('submitting TransientCard calls onAddCard and closes the form', async () => {
      const onAddCard = vi.fn()
      render(
        <div>
          <VaultView {...baseProps} view="tab" onAddCard={onAddCard} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
      await userEvent.type(screen.getByLabelText('Title'), 'New card')
      await userEvent.click(screen.getByRole('button', { name: /add →/i }))
      expect(onAddCard).toHaveBeenCalledWith({ title: 'New card', body: '' })
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    })
  })

  describe('shelf view', () => {
    it('shows shelf entries when view is "shelf"', () => {
      render(
        <VaultView
          {...baseProps}
          view="shelf"
          tabEntries={[makeTabEntry()]}
          shelfEntries={[shelfCard]}
        />,
      )
      expect(screen.getByText('Shelf Card')).toBeInTheDocument()
      expect(screen.queryByText('Tab Card')).not.toBeInTheDocument()
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

    it('calls onMoveToLibrary with cardId and folderId when Library root is selected', async () => {
      const onMoveToLibrary = vi.fn()
      render(
        <VaultView
          {...baseProps}
          view="shelf"
          shelfEntries={[shelfCard]}
          folders={[]}
          onMoveToLibrary={onMoveToLibrary}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
      await userEvent.click(screen.getByRole('button', { name: 'Library root' }))
      expect(onMoveToLibrary).toHaveBeenCalledWith('s1', null)
    })

    it('does not show the Dock in shelf view', () => {
      render(<VaultView {...baseProps} view="shelf" onAddCard={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument()
    })
  })

  describe('library view', () => {
    it('shows library entries when view is "library"', () => {
      render(
        <VaultView
          {...baseProps}
          view="library"
          tabEntries={[makeTabEntry()]}
          shelfEntries={[shelfCard]}
          libraryEntries={[libraryCard]}
        />,
      )
      expect(screen.getByText('Library Card')).toBeInTheDocument()
      expect(screen.queryByText('Tab Card')).not.toBeInTheDocument()
      expect(screen.queryByText('Shelf Card')).not.toBeInTheDocument()
    })

    it('renders the library folder tree when view is library', () => {
      render(<VaultView {...baseProps} view="library" />)
      expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
    })

    it('does not show the Dock in library view', () => {
      render(<VaultView {...baseProps} view="library" onAddCard={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument()
    })

    it('does not show location button for library cards', () => {
      render(
        <VaultView
          {...baseProps}
          view="library"
          libraryEntries={[libraryCard]}
          onSaveToShelf={() => {}}
          onMoveToLibrary={() => {}}
        />,
      )
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Move to Library' })).not.toBeInTheDocument()
    })
  })
})
