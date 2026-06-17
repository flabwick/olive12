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

  it('renders no action button when onMoveToLibrary is not provided', () => {
    render(<ShelfRow card={card} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onMoveToLibrary when Move to Library button is clicked', async () => {
    const onMoveToLibrary = vi.fn()
    render(<ShelfRow card={card} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    expect(onMoveToLibrary).toHaveBeenCalledOnce()
  })
})
