import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { StackCard } from './StackCard'

vi.mock('../card/CardBack', () => ({
  CardBack: ({ back, onFlip }) => (
    <div data-testid="card-back">
      <span>{back}</span>
      <button type="button" onClick={onFlip} aria-label="Flip to front">↩</button>
    </div>
  ),
}))

vi.mock('../card/Card', () => ({
  Card: ({ title, body, cardId, foldState, onToggleFold }) => (
    <div data-testid={`card-${cardId}`}>
      <h3>{title}</h3>
      {!foldState && <p>{body}</p>}
      {onToggleFold && (
        <button type="button" onClick={onToggleFold} aria-label="Toggle fold" />
      )}
    </div>
  ),
}))

vi.mock('../card/FileCard', () => ({
  FileCard: ({ title, cardId }) => (
    <div data-testid={`file-card-${cardId}`}>
      <h3>{title}</h3>
    </div>
  ),
}))

const makeStack = (overrides = {}) => ({
  id: 'stack-1',
  type: 'stack',
  title: 'My Stack',
  body: '',
  back: 'Stack notes',
  config: { memberIds: ['a', 'b', 'c'], topCardId: 'a' },
  location: 'none',
  createdAt: 0,
  updatedAt: 0,
  ...overrides,
})

const cardsById = {
  a: { id: 'a', type: 'text', title: 'Card A', body: 'Body of A' },
  b: { id: 'b', type: 'text', title: 'Card B', body: 'Body of B' },
  c: { id: 'c', type: 'text', title: 'Card C', body: '' },
}

describe('StackCard', () => {
  it('renders the stack title in the header', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} />)
    expect(screen.getByRole('heading', { level: 3, name: 'My Stack' })).toBeInTheDocument()
  })

  it('renders the top card title in collapsed view', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} />)
    expect(screen.getByText('Card A')).toBeInTheDocument()
  })

  it('renders the top card body in collapsed view', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} />)
    expect(screen.getByText('Body of A')).toBeInTheDocument()
  })

  it('renders cycle prev and next buttons', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} onCyclePrev={() => {}} onCycleNext={() => {}} />)
    expect(screen.getByRole('button', { name: 'Previous card' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next card' })).toBeInTheDocument()
  })

  it('renders "N/M" cycle count', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} onCyclePrev={() => {}} onCycleNext={() => {}} />)
    expect(screen.getByLabelText('Card 1 of 3')).toBeInTheDocument()
  })

  it('calls onCyclePrev when previous button is clicked', async () => {
    const onCyclePrev = vi.fn()
    render(<StackCard stack={makeStack()} cardsById={cardsById} onCyclePrev={onCyclePrev} onCycleNext={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Previous card' }))
    expect(onCyclePrev).toHaveBeenCalledOnce()
  })

  it('calls onCycleNext when next button is clicked', async () => {
    const onCycleNext = vi.fn()
    render(<StackCard stack={makeStack()} cardsById={cardsById} onCyclePrev={() => {}} onCycleNext={onCycleNext} />)
    await userEvent.click(screen.getByRole('button', { name: 'Next card' }))
    expect(onCycleNext).toHaveBeenCalledOnce()
  })

  it('applies stack-card--hidden class when hiddenState is true', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} hiddenState={true} />)
    const header = screen.getByRole('heading', { level: 3, name: 'My Stack' })
    expect(header.closest('.stack-card')).toHaveClass('stack-card--hidden')
  })

  it('does not apply stack-card--hidden when hiddenState is false', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} hiddenState={false} />)
    const header = screen.getByRole('heading', { level: 3, name: 'My Stack' })
    expect(header.closest('.stack-card')).not.toHaveClass('stack-card--hidden')
  })

  it('applies stack-card--flipped class when flipped is true', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} flipped={true} />)
    const header = screen.getByRole('heading', { level: 3, name: 'My Stack' })
    expect(header.closest('.stack-card')).toHaveClass('stack-card--flipped')
  })

  it('renders CardBack when flipped is true', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} flipped={true} />)
    expect(screen.getByTestId('card-back')).toBeInTheDocument()
  })

  it('hides cycle controls and top card when foldState is true', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} foldState={true} />)
    expect(screen.queryByRole('button', { name: 'Previous card' })).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-a')).not.toBeInTheDocument()
  })

  it('clicking expand toggle shows all member cards', async () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    expect(screen.getByTestId('card-a')).toBeInTheDocument()
    expect(screen.getByTestId('card-b')).toBeInTheDocument()
    expect(screen.getByTestId('card-c')).toBeInTheDocument()
    expect(screen.getByText('Card A')).toBeInTheDocument()
    expect(screen.getByText('Card B')).toBeInTheDocument()
    expect(screen.getByText('Card C')).toBeInTheDocument()
  })

  it('expanded view shows reorder buttons for each member when onReorderMember provided', async () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} onReorderMember={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' })
    const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' })
    expect(moveUpButtons).toHaveLength(3)
    expect(moveDownButtons).toHaveLength(3)
  })

  it('calls onReorderMember when move up is clicked on second member', async () => {
    const onReorderMember = vi.fn()
    render(<StackCard stack={makeStack()} cardsById={cardsById} onReorderMember={onReorderMember} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' })
    await userEvent.click(moveUpButtons[1])
    expect(onReorderMember).toHaveBeenCalledWith(1, 0)
  })

  it('first member move-up button is disabled', async () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} onReorderMember={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move up' })
    expect(moveUpButtons[0]).toBeDisabled()
  })

  it('last member move-down button is disabled', async () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} onReorderMember={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    const moveDownButtons = screen.getAllByRole('button', { name: 'Move down' })
    expect(moveDownButtons[2]).toBeDisabled()
  })

  it('clicking expand toggle twice returns to collapsed view', async () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} onCyclePrev={() => {}} onCycleNext={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    await userEvent.click(screen.getByRole('button', { name: 'Collapse stack' }))
    expect(screen.getByRole('button', { name: 'Previous card' })).toBeInTheDocument()
  })

  it('renders "No cards" when stack has no members', () => {
    const emptyStack = makeStack({ config: { memberIds: [], topCardId: null } })
    render(<StackCard stack={emptyStack} cardsById={cardsById} />)
    expect(screen.getByText('No cards')).toBeInTheDocument()
  })

  it('renders collapsed top card as the full Card component', () => {
    render(<StackCard stack={makeStack()} cardsById={cardsById} />)
    // Mock Card renders with data-testid="card-a" for the top card (id 'a')
    expect(screen.getByTestId('card-a')).toBeInTheDocument()
  })

  it('calls isFlipped with the top card id to determine flip state', () => {
    const isFlipped = vi.fn(() => false)
    render(<StackCard stack={makeStack()} cardsById={cardsById} isFlipped={isFlipped} />)
    expect(isFlipped).toHaveBeenCalledWith('a')
  })

  it('renders file card member using FileCard component in expanded view', async () => {
    const withFile = {
      f: { id: 'f', type: 'file', title: 'doc.pdf', fileName: 'doc.pdf', fileType: 'pdf', fileSize: 100 },
      b: cardsById.b,
    }
    const fileStack = makeStack({ config: { memberIds: ['f', 'b'], topCardId: 'f' } })
    render(<StackCard stack={fileStack} cardsById={withFile} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand stack' }))
    expect(screen.getByTestId('file-card-f')).toBeInTheDocument()
  })
})
