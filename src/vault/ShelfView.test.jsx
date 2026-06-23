import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShelfView } from './ShelfView'

const cards = [
  { id: 'c1', title: 'Meeting notes', body: 'agenda here', location: 'shelf' },
  { id: 'c2', title: 'Ideas', body: '', location: 'shelf' },
]
const tabs = [
  { id: 't1', name: 'Research tab', savedLocation: 'shelf' },
]

describe('ShelfView', () => {
  it('renders card titles', () => {
    render(<ShelfView cards={cards} />)
    expect(screen.getByText('Meeting notes')).toBeInTheDocument()
    expect(screen.getByText('Ideas')).toBeInTheDocument()
  })

  it('renders tab names', () => {
    render(<ShelfView tabs={tabs} />)
    expect(screen.getByText('Research tab')).toBeInTheDocument()
  })

  it('shows empty state when no cards or tabs', () => {
    render(<ShelfView />)
    expect(screen.getByText('Nothing saved to shelf yet.')).toBeInTheDocument()
  })

  it('does not render section headings', () => {
    render(<ShelfView cards={cards} tabs={tabs} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })

  it('calls onSelect when item is selected in selectMode', async () => {
    const onSelect = vi.fn()
    render(
      <ShelfView cards={cards} selectMode selected={new Set()} onSelect={onSelect} />,
    )
    await userEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onSelect).toHaveBeenCalledWith('c1')
  })

  it('calls onItemClick with the card and type when a card is clicked', async () => {
    const onItemClick = vi.fn()
    render(<ShelfView cards={cards} onItemClick={onItemClick} />)
    await userEvent.click(screen.getByText('Meeting notes'))
    expect(onItemClick).toHaveBeenCalledWith(cards[0], 'card')
  })

  it('calls onItemClick with the tab and type when a tab row is clicked', async () => {
    const onItemClick = vi.fn()
    render(<ShelfView tabs={tabs} onItemClick={onItemClick} />)
    await userEvent.click(screen.getByText('Research tab'))
    expect(onItemClick).toHaveBeenCalledWith(tabs[0], 'tab')
  })
})
