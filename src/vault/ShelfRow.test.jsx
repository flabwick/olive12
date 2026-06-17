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

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
]

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

  it('clicking Move to Library opens the folder picker', async () => {
    render(<ShelfRow card={card} folders={[]} onMoveToLibrary={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    expect(screen.getByRole('dialog', { name: 'Move to Library' })).toBeInTheDocument()
  })

  it('selecting Library root calls onMoveToLibrary with null', async () => {
    const onMoveToLibrary = vi.fn()
    render(<ShelfRow card={card} folders={[]} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Library root' }))
    expect(onMoveToLibrary).toHaveBeenCalledWith(null)
  })

  it('selecting a folder calls onMoveToLibrary with folderId', async () => {
    const onMoveToLibrary = vi.fn()
    render(<ShelfRow card={card} folders={folders} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Work' }))
    expect(onMoveToLibrary).toHaveBeenCalledWith('f1')
  })

  it('dismissing the overlay closes it without calling onMoveToLibrary', async () => {
    const onMoveToLibrary = vi.fn()
    render(<ShelfRow card={card} folders={[]} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onMoveToLibrary).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
