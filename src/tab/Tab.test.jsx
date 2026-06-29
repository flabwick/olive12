import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tab } from './Tab'

vi.mock('../card/RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, editable, ariaLabel }) => (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel}
      readOnly={!editable}
    />
  ),
}))

const makeEntry = (overrides = {}) => ({
  card: { id: 'card-1', title: 'Title', body: 'Body text', type: 'text', location: 'none' },
  position: 0,
  foldState: false,
  hiddenState: false,
  ...overrides,
})

describe('Tab', () => {
  it('renders an empty-state message when entries is empty', () => {
    render(<Tab entries={[]} />)
    expect(screen.getByText('No cards yet.')).toBeInTheDocument()
  })

  it('renders card title and body when entry is visible and unfolded', () => {
    render(<Tab entries={[makeEntry()]} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
  })

  it('renders the title but hides body when foldState is true', () => {
    render(<Tab entries={[makeEntry({ foldState: true })]} />)
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.queryByText('Body text')).not.toBeInTheDocument()
  })

  it('renders a hidden card with reduced opacity rather than removing it', () => {
    render(<Tab entries={[makeEntry({ hiddenState: true })]} />)
    const heading = screen.getByRole('heading', { level: 3, name: 'Title' })
    expect(heading).toBeInTheDocument()
    const card = heading.closest('.card')
    expect(card).toHaveClass('card--hidden')
  })

  it('renders cards in position order', () => {
    const entries = [
      makeEntry({ card: { id: 'b', title: 'B', body: '', type: 'text' }, position: 1 }),
      makeEntry({ card: { id: 'a', title: 'A', body: '', type: 'text' }, position: 0 }),
    ]
    render(<Tab entries={entries} />)
    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('B')
    expect(items[1]).toHaveTextContent('A')
  })

  it('shows Collapse button when card is unfolded', () => {
    render(<Tab entries={[makeEntry()]} onFold={() => {}} onUnfold={() => {}} />)
    expect(screen.getByRole('button', { name: 'Collapse card' })).toBeInTheDocument()
  })

  it('shows Expand button when card is folded', () => {
    render(<Tab entries={[makeEntry({ foldState: true })]} onFold={() => {}} onUnfold={() => {}} />)
    expect(screen.getByRole('button', { name: 'Expand card' })).toBeInTheDocument()
  })

  it('shows Dim button when card is visible', () => {
    render(<Tab entries={[makeEntry()]} onHide={() => {}} onUnhide={() => {}} />)
    expect(screen.getByRole('button', { name: 'Dim card' })).toBeInTheDocument()
  })

  it('shows Show button when card is hidden', () => {
    render(
      <Tab entries={[makeEntry({ hiddenState: true })]} onHide={() => {}} onUnhide={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Show card' })).toBeInTheDocument()
  })

  it('calls onFold when Collapse is clicked', async () => {
    const onFold = vi.fn()
    render(<Tab entries={[makeEntry()]} onFold={onFold} onUnfold={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse card' }))
    expect(onFold).toHaveBeenCalledWith('card-1')
  })

  it('calls onUnfold when Expand is clicked', async () => {
    const onUnfold = vi.fn()
    render(
      <Tab entries={[makeEntry({ foldState: true })]} onFold={() => {}} onUnfold={onUnfold} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Expand card' }))
    expect(onUnfold).toHaveBeenCalledWith('card-1')
  })

  it('calls onHide when Dim is clicked', async () => {
    const onHide = vi.fn()
    render(<Tab entries={[makeEntry()]} onHide={onHide} onUnhide={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dim card' }))
    expect(onHide).toHaveBeenCalledWith('card-1')
  })

  it('calls onUnhide when Show is clicked', async () => {
    const onUnhide = vi.fn()
    render(
      <Tab
        entries={[makeEntry({ hiddenState: true })]}
        onHide={() => {}}
        onUnhide={onUnhide}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Show card' }))
    expect(onUnhide).toHaveBeenCalledWith('card-1')
  })

  describe('remove', () => {
    it('renders Remove card button when onRemove is provided', () => {
      render(<Tab entries={[makeEntry()]} onRemove={() => {}} />)
      expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
    })

    it('calls onRemove with the card id after confirming delete', async () => {
      const onRemove = vi.fn()
      render(<Tab entries={[makeEntry()]} onRemove={onRemove} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
      expect(onRemove).toHaveBeenCalledWith('card-1')
    })
  })

  describe('location', () => {
    it('renders Save card button when onSaveToShelf is provided and location is "none"', () => {
      render(<Tab entries={[makeEntry()]} onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save card' })).toBeInTheDocument()
    })

    it('calls onSaveToShelf with the card id when clicked', async () => {
      const onSaveToShelf = vi.fn()
      render(<Tab entries={[makeEntry()]} onSaveToShelf={onSaveToShelf} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save card' }))
      expect(onSaveToShelf).toHaveBeenCalledWith('card-1')
    })

    it('renders no location button when location is "shelf"', () => {
      const entry = makeEntry({ card: { id: 'card-1', title: 'T', body: 'B', type: 'text', location: 'shelf' } })
      render(<Tab entries={[entry]} onMoveToLibrary={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save card' })).not.toBeInTheDocument()
    })

    it('does not expose move-to-library from tab card header when on shelf', async () => {
      const onMoveToLibrary = vi.fn()
      const entry = makeEntry({ card: { id: 'card-1', title: 'T', body: 'B', type: 'text', location: 'shelf' } })
      render(<Tab entries={[entry]} folders={[]} onMoveToLibrary={onMoveToLibrary} />)
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(onMoveToLibrary).not.toHaveBeenCalled()
    })

    it('renders no location buttons when callbacks are not provided', () => {
      render(<Tab entries={[makeEntry()]} />)
      expect(screen.queryByRole('button', { name: 'Save card' })).not.toBeInTheDocument()
    })
  })

  describe('portal card', () => {
    const makePortalEntry = (targetCardId) => ({
      card: {
        id: 'portal-1',
        type: 'portal',
        config: { target_card_id: targetCardId },
        title: '',
        body: '',
        location: 'none',
      },
      position: 0,
      foldState: false,
      hiddenState: false,
    })

    it('renders target title and body for a resolved portal card', () => {
      const cardsById = {
        'target-1': { id: 'target-1', title: 'Target card', body: 'Target body', type: 'text', config: null },
      }
      render(<Tab entries={[makePortalEntry('target-1')]} cardsById={cardsById} />)
      expect(screen.getByText('Target card')).toBeInTheDocument()
      expect(screen.getByText('Target body')).toBeInTheDocument()
    })

    it('renders placeholder when portal target is null', () => {
      render(<Tab entries={[makePortalEntry(null)]} cardsById={{}} />)
      expect(screen.getByText('Portal — no target')).toBeInTheDocument()
      expect(screen.getByText('No card linked.')).toBeInTheDocument()
    })

    it('calls onUpdate with target card id when portal card content is edited', async () => {
      const onUpdate = vi.fn()
      const cardsById = {
        'target-1': { id: 'target-1', title: 'Target', body: 'Old body', type: 'text', config: null },
      }
      render(
        <div>
          <Tab entries={[makePortalEntry('target-1')]} cardsById={cardsById} onUpdate={onUpdate} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      const textarea = screen.getByRole('textbox', { name: 'Card body' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'New body')
      await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
      expect(onUpdate).toHaveBeenCalledWith('target-1', { title: 'Target', body: 'New body' })
    })

    it('portal card with no target is not editable', () => {
      render(<Tab entries={[makePortalEntry(null)]} cardsById={{}} onUpdate={() => {}} />)
      expect(screen.queryByRole('button', { name: 'No card linked.' })).not.toBeInTheDocument()
    })

    it('calls onLocate with the target card id when Show in vault is clicked', async () => {
      const onLocate = vi.fn()
      const cardsById = {
        'target-1': { id: 'target-1', title: 'Target', body: 'Body', type: 'text', config: null },
      }
      render(<Tab entries={[makePortalEntry('target-1')]} cardsById={cardsById} onLocate={onLocate} />)
      await userEvent.click(screen.getByRole('button', { name: 'Show in vault' }))
      expect(onLocate).toHaveBeenCalledWith('target-1')
    })
  })

  describe('inline update', () => {
    it('passes onUpdate to each Card', async () => {
      const onUpdate = vi.fn()
      render(
        <div>
          <Tab entries={[makeEntry()]} onUpdate={onUpdate} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      const textarea = screen.getByRole('textbox', { name: 'Card body' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Updated')
      await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
      expect(onUpdate).toHaveBeenCalledWith('card-1', { title: 'Title', body: 'Updated' })
    })
  })

  describe('move to dock', () => {
    it('renders Move to dock button when onMoveToDock is provided', () => {
      render(<Tab entries={[makeEntry()]} onMoveToDock={() => {}} />)
      expect(screen.getByRole('button', { name: 'Move to dock' })).toBeInTheDocument()
    })

    it('does not render Move to dock button when onMoveToDock is not provided', () => {
      render(<Tab entries={[makeEntry()]} />)
      expect(screen.queryByRole('button', { name: 'Move to dock' })).not.toBeInTheDocument()
    })

    it('calls onMoveToDock with card id when clicked', async () => {
      const onMoveToDock = vi.fn()
      render(<Tab entries={[makeEntry()]} onMoveToDock={onMoveToDock} />)
      await userEvent.click(screen.getByRole('button', { name: 'Move to dock' }))
      expect(onMoveToDock).toHaveBeenCalledWith('card-1')
    })
  })

  describe('AddCardButton', () => {
    it('renders AddCardButton when onAddCard is provided', () => {
      render(<Tab entries={[makeEntry()]} onAddCard={() => {}} />)
      expect(screen.getByRole('button', { name: 'Add new card' })).toBeInTheDocument()
    })

    it('renders AI prompt button alongside AddCardButton', () => {
      render(<Tab entries={[makeEntry()]} onAddCard={() => {}} />)
      expect(screen.getByRole('button', { name: 'AI prompt' })).toBeInTheDocument()
    })

    it('does not render AI prompt button when onAddCard is not provided', () => {
      render(<Tab entries={[makeEntry()]} />)
      expect(screen.queryByRole('button', { name: 'AI prompt' })).not.toBeInTheDocument()
    })

    it('does not render AddCardButton when onAddCard is not provided', () => {
      render(<Tab entries={[makeEntry()]} />)
      expect(screen.queryByRole('button', { name: 'Add new card' })).not.toBeInTheDocument()
    })

    it('renders AddCardButton in empty state when onAddCard is provided', () => {
      render(<Tab entries={[]} onAddCard={() => {}} />)
      expect(screen.getByRole('button', { name: 'Add new card' })).toBeInTheDocument()
    })

    it('clicking AddCardButton calls onAddCard', async () => {
      const onAddCard = vi.fn().mockResolvedValue({ id: 'new-card' })
      render(<Tab entries={[makeEntry()]} onAddCard={onAddCard} />)
      await userEvent.click(screen.getByRole('button', { name: 'Add new card' }))
      expect(onAddCard).toHaveBeenCalled()
    })

    it('card matching returned id gets autoFocus (enters editing mode)', async () => {
      const onAddCard = vi.fn().mockResolvedValue({ id: 'card-1' })
      render(<Tab entries={[makeEntry()]} onAddCard={onAddCard} onUpdate={() => {}} />)
      await userEvent.click(screen.getByRole('button', { name: 'Add new card' }))
      await waitFor(() => {
        expect(screen.getByRole('textbox', { name: 'Card title' })).toBeInTheDocument()
      })
    })

    it('clears focusCardId after 300ms to prevent re-focus on re-render', () => {
      vi.useFakeTimers()
      const onAddCard = vi.fn().mockResolvedValue({ id: 'card-1' })
      render(<Tab entries={[makeEntry()]} onAddCard={onAddCard} onUpdate={() => {}} />)
      fireEvent.click(screen.getByRole('button', { name: 'Add new card' }))
      expect(onAddCard).toHaveBeenCalledOnce()
      vi.advanceTimersByTime(400)
      vi.useRealTimers()
    })
  })
})
