import { render, screen } from '@testing-library/react'
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

  describe('reorder', () => {
    const twoEntries = [
      makeEntry({ card: { id: 'a', title: 'A', body: 'a', type: 'text' }, position: 0 }),
      makeEntry({ card: { id: 'b', title: 'B', body: 'b', type: 'text' }, position: 1 }),
    ]

    it('first card has no Move up button', () => {
      render(<Tab entries={twoEntries} onReorder={() => {}} />)
      const upButtons = screen.queryAllByRole('button', { name: 'Move card up' })
      // Only one up button (for the second card), not two
      expect(upButtons).toHaveLength(1)
    })

    it('last card has no Move down button', () => {
      render(<Tab entries={twoEntries} onReorder={() => {}} />)
      const downButtons = screen.queryAllByRole('button', { name: 'Move card down' })
      expect(downButtons).toHaveLength(1)
    })

    it('single card has no reorder buttons', () => {
      render(<Tab entries={[makeEntry()]} onReorder={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Move card up' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Move card down' })).not.toBeInTheDocument()
    })

    it('calls onReorder with (cardId, position-1) when up is clicked on second card', async () => {
      const onReorder = vi.fn()
      render(<Tab entries={twoEntries} onReorder={onReorder} />)
      const upButtons = screen.getAllByRole('button', { name: 'Move card up' })
      await userEvent.click(upButtons[0])
      expect(onReorder).toHaveBeenCalledWith('b', 0)
    })

    it('calls onReorder with (cardId, position+1) when down is clicked on first card', async () => {
      const onReorder = vi.fn()
      render(<Tab entries={twoEntries} onReorder={onReorder} />)
      const downButtons = screen.getAllByRole('button', { name: 'Move card down' })
      await userEvent.click(downButtons[0])
      expect(onReorder).toHaveBeenCalledWith('a', 1)
    })
  })

  describe('remove', () => {
    it('renders Remove card button when onRemove is provided', () => {
      render(<Tab entries={[makeEntry()]} onRemove={() => {}} />)
      expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
    })

    it('calls onRemove with the card id when X is clicked', async () => {
      const onRemove = vi.fn()
      render(<Tab entries={[makeEntry()]} onRemove={onRemove} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      expect(onRemove).toHaveBeenCalledWith('card-1')
    })
  })

  describe('location', () => {
    it('renders Save to Shelf button when onSaveToShelf is provided and location is "none"', () => {
      render(<Tab entries={[makeEntry()]} onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save to Shelf' })).toBeInTheDocument()
    })

    it('calls onSaveToShelf with the card id when clicked', async () => {
      const onSaveToShelf = vi.fn()
      render(<Tab entries={[makeEntry()]} onSaveToShelf={onSaveToShelf} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save to Shelf' }))
      expect(onSaveToShelf).toHaveBeenCalledWith('card-1')
    })

    it('renders no location button when location is "shelf"', () => {
      const entry = makeEntry({ card: { id: 'card-1', title: 'T', body: 'B', type: 'text', location: 'shelf' } })
      render(<Tab entries={[entry]} onMoveToLibrary={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
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
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
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

  describe('flip', () => {
    it('passes flipped=true to Card when isFlipped returns true for that card id', () => {
      const isFlipped = (id) => id === 'card-1'
      render(<Tab entries={[makeEntry()]} isFlipped={isFlipped} flipCard={() => {}} />)
      const card = screen.getByRole('heading', { level: 3, name: 'Title' }).closest('.card')
      expect(card).toHaveClass('card--flipped')
    })

    it('passes flipped=false when isFlipped returns false', () => {
      const isFlipped = () => false
      render(<Tab entries={[makeEntry()]} isFlipped={isFlipped} flipCard={() => {}} />)
      const card = screen.getByRole('heading', { level: 3, name: 'Title' }).closest('.card')
      expect(card).not.toHaveClass('card--flipped')
    })

    it('passes onFlip to Card which calls flipCard with the card id', async () => {
      const flipCard = vi.fn()
      const entry = makeEntry({
        card: { id: 'card-1', title: 'Q', body: 'Body', type: 'text', location: 'none', back: 'Answer' },
      })
      render(<Tab entries={[entry]} isFlipped={() => false} flipCard={flipCard} />)
      await userEvent.click(screen.getByRole('button', { name: 'Show card back' }))
      expect(flipCard).toHaveBeenCalledWith('card-1')
    })

    it('PortalCard receives flip button when flipCard is provided', () => {
      const flipCard = vi.fn()
      const portalEntry = {
        card: { id: 'portal-1', type: 'portal', config: { target_card_id: null }, title: '', body: '', location: 'none' },
        position: 0,
        foldState: false,
        hiddenState: false,
      }
      render(<Tab entries={[portalEntry]} isFlipped={() => false} flipCard={flipCard} />)
      expect(screen.getByRole('button', { name: 'Show card back' })).toBeInTheDocument()
    })

    it('PortalCard flip button calls flipCard with portal card id', async () => {
      const flipCard = vi.fn()
      const cardsById = {
        'target-1': { id: 'target-1', title: 'Target', body: 'Body', back: '', type: 'text', config: null },
      }
      const portalEntry = {
        card: { id: 'portal-1', type: 'portal', config: { target_card_id: 'target-1' }, title: '', body: '', location: 'none' },
        position: 0,
        foldState: false,
        hiddenState: false,
      }
      render(<Tab entries={[portalEntry]} cardsById={cardsById} isFlipped={() => false} flipCard={flipCard} />)
      await userEvent.click(screen.getByRole('button', { name: 'Show card back' }))
      expect(flipCard).toHaveBeenCalledWith('portal-1')
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
})
