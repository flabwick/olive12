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
})
