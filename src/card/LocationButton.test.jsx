import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LocationButton } from './LocationButton'

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
]

describe('LocationButton', () => {
  describe('location = none', () => {
    it('renders the + button when onSaveToShelf is provided', () => {
      render(<LocationButton location="none" folders={[]} onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save to Inbox' })).toBeInTheDocument()
    })

    it('renders nothing when onSaveToShelf is not provided', () => {
      render(<LocationButton location="none" folders={[]} />)
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('calls onSaveToShelf when the + button is clicked', async () => {
      const onSaveToShelf = vi.fn()
      render(<LocationButton location="none" folders={[]} onSaveToShelf={onSaveToShelf} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save to Inbox' }))
      expect(onSaveToShelf).toHaveBeenCalledOnce()
    })
  })

  describe('location = shelf', () => {
    it('renders the ✓ button', () => {
      render(<LocationButton location="shelf" folders={[]} onMoveToLibrary={() => {}} />)
      expect(
        screen.getByRole('button', { name: 'Saved to Inbox — click to move to Vault' }),
      ).toBeInTheDocument()
    })

    it('clicking ✓ opens the folder picker overlay', async () => {
      render(<LocationButton location="shelf" folders={[]} onMoveToLibrary={() => {}} />)
      await userEvent.click(
        screen.getByRole('button', { name: 'Saved to Inbox — click to move to Vault' }),
      )
      expect(screen.getByRole('dialog', { name: 'Move to Vault' })).toBeInTheDocument()
    })

    it('selecting Vault root calls onMoveToLibrary with null', async () => {
      const onMoveToLibrary = vi.fn()
      render(<LocationButton location="shelf" folders={[]} onMoveToLibrary={onMoveToLibrary} />)
      await userEvent.click(
        screen.getByRole('button', { name: 'Saved to Inbox — click to move to Vault' }),
      )
      await userEvent.click(screen.getByRole('button', { name: 'Vault root' }))
      expect(onMoveToLibrary).toHaveBeenCalledWith(null)
    })

    it('selecting a folder calls onMoveToLibrary with folder id', async () => {
      const onMoveToLibrary = vi.fn()
      render(
        <LocationButton location="shelf" folders={folders} onMoveToLibrary={onMoveToLibrary} />,
      )
      await userEvent.click(
        screen.getByRole('button', { name: 'Saved to Inbox — click to move to Vault' }),
      )
      await userEvent.click(screen.getByRole('button', { name: 'Work' }))
      expect(onMoveToLibrary).toHaveBeenCalledWith('f1')
    })

    it('dismissing the overlay closes it without calling onMoveToLibrary', async () => {
      const onMoveToLibrary = vi.fn()
      render(<LocationButton location="shelf" folders={[]} onMoveToLibrary={onMoveToLibrary} />)
      await userEvent.click(
        screen.getByRole('button', { name: 'Saved to Inbox — click to move to Vault' }),
      )
      await userEvent.click(screen.getByRole('button', { name: 'Close' }))
      expect(onMoveToLibrary).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('location = library', () => {
    it('renders a disabled ✓ button', () => {
      render(<LocationButton location="library" folders={[]} />)
      const btn = screen.getByRole('button', { name: 'In Vault' })
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
    })
  })
})
