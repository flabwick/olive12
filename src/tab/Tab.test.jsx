import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Tab } from './Tab'

const makeEntry = (overrides = {}) => ({
  card: { id: 'card-1', title: 'Title', body: 'Body text', type: 'text' },
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

  describe('inline update', () => {
    it('passes onUpdate to each Card', async () => {
      const onUpdate = vi.fn()
      render(
        <div>
          <Tab entries={[makeEntry()]} onUpdate={onUpdate} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Body text' }))
      const textarea = screen.getByRole('textbox', { name: 'Card body' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Updated')
      await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
      expect(onUpdate).toHaveBeenCalledWith('card-1', { title: 'Title', body: 'Updated' })
    })
  })
})
