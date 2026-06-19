import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ShelfRow } from './ShelfRow'

const card = {
  id: 'c1',
  title: 'My note',
  type: 'text',
  body: 'Some body',
  location: 'shelf',
  folderId: null,
  createdAt: new Date('2024-03-15').getTime(),
  updatedAt: new Date('2024-03-15').getTime(),
}

describe('ShelfRow', () => {
  it('renders the card title', () => {
    render(<ShelfRow card={card} />)
    expect(screen.getByText('My note')).toBeInTheDocument()
  })

  it('renders the card type', () => {
    render(<ShelfRow card={card} />)
    expect(screen.getByText('text')).toBeInTheDocument()
  })

  it('renders the createdAt date', () => {
    render(<ShelfRow card={card} />)
    expect(screen.getByText(/Mar/)).toBeInTheDocument()
  })

  it('renders Move to Library button when onMoveToLibrary is provided', () => {
    render(<ShelfRow card={card} onMoveToLibrary={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move to Library' })).toBeInTheDocument()
  })

  it('renders no action button when neither callback is provided', () => {
    render(<ShelfRow card={card} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onMoveToLibrary when Move to Library button is clicked', async () => {
    const onMoveToLibrary = vi.fn()
    render(<ShelfRow card={card} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    expect(onMoveToLibrary).toHaveBeenCalledOnce()
  })

  it('renders Open in tab button when onOpenAsPortal is provided', () => {
    render(<ShelfRow card={card} onOpenAsPortal={() => {}} />)
    expect(screen.getByRole('button', { name: 'Open in tab' })).toBeInTheDocument()
  })

  it('calls onOpenAsPortal with card id when Open in tab is clicked', async () => {
    const onOpenAsPortal = vi.fn()
    render(<ShelfRow card={card} onOpenAsPortal={onOpenAsPortal} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open in tab' }))
    expect(onOpenAsPortal).toHaveBeenCalledWith(card.id)
  })

  it('does not render Open in tab button when onOpenAsPortal is not provided', () => {
    render(<ShelfRow card={card} onMoveToLibrary={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Open in tab' })).not.toBeInTheDocument()
  })

  it('applies shelf-row--highlighted class when highlighted is true', () => {
    render(<ShelfRow card={card} highlighted={true} />)
    expect(screen.getByRole('listitem')).toHaveClass('shelf-row--highlighted')
  })

  it('does not apply shelf-row--highlighted class when highlighted is false', () => {
    render(<ShelfRow card={card} highlighted={false} />)
    expect(screen.getByRole('listitem')).not.toHaveClass('shelf-row--highlighted')
  })
})
