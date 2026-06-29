import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CardHeader } from './CardHeader'

describe('CardHeader', () => {
  it('renders the title as a heading', () => {
    render(<CardHeader title="My card" />)
    expect(screen.getByRole('heading', { level: 3, name: 'My card' })).toBeInTheDocument()
  })

  it('renders no buttons when no callbacks are provided', () => {
    render(<CardHeader title="Plain" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders title as input when editing is true', () => {
    render(<CardHeader title="My card" editing={true} onTitleChange={() => {}} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Card title' })).toHaveValue('My card')
  })

  it('calls onTitleChange when title input changes', async () => {
    const onTitleChange = vi.fn()
    render(<CardHeader title="Old" editing={true} onTitleChange={onTitleChange} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Card title' }), '!')
    expect(onTitleChange).toHaveBeenCalled()
  })

  describe('fold toggle', () => {
    it('renders hamburger button when onToggleFold is provided', () => {
      render(<CardHeader title="A" onToggleFold={() => {}} />)
      expect(screen.getByRole('button', { name: 'Collapse card' })).toBeInTheDocument()
    })

    it('shows Expand label when folded is true', () => {
      render(<CardHeader title="A" folded={true} onToggleFold={() => {}} />)
      expect(screen.getByRole('button', { name: 'Expand card' })).toBeInTheDocument()
    })

    it('has fold-toggle class on the fold button', () => {
      render(<CardHeader title="A" folded={true} onToggleFold={() => {}} />)
      expect(screen.getByRole('button', { name: 'Expand card' })).toHaveClass('card-header__fold-toggle')
    })

    it('calls onToggleFold when fold button is clicked', async () => {
      const onToggleFold = vi.fn()
      render(<CardHeader title="A" onToggleFold={onToggleFold} />)
      await userEvent.click(screen.getByRole('button', { name: 'Collapse card' }))
      expect(onToggleFold).toHaveBeenCalledOnce()
    })
  })

  describe('eye / hide toggle', () => {
    it('renders eye button when onToggleHide is provided', () => {
      render(<CardHeader title="A" onToggleHide={() => {}} />)
      expect(screen.getByRole('button', { name: 'Dim card' })).toBeInTheDocument()
    })

    it('shows Show label when hidden is true', () => {
      render(<CardHeader title="A" hidden={true} onToggleHide={() => {}} />)
      expect(screen.getByRole('button', { name: 'Show card' })).toBeInTheDocument()
    })

    it('calls onToggleHide when eye button is clicked', async () => {
      const onToggleHide = vi.fn()
      render(<CardHeader title="A" onToggleHide={onToggleHide} />)
      await userEvent.click(screen.getByRole('button', { name: 'Dim card' }))
      expect(onToggleHide).toHaveBeenCalledOnce()
    })
  })

  describe('save indicator', () => {
    it('renders Save card button when onSaveToShelf provided and location is none', () => {
      render(<CardHeader title="A" location="none" onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save card' })).toBeInTheDocument()
    })

    it('renders disabled Saved button when onSaveToShelf provided and location is shelf', () => {
      render(<CardHeader title="A" location="shelf" onSaveToShelf={() => {}} />)
      const btn = screen.getByRole('button', { name: 'Saved' })
      expect(btn).toBeInTheDocument()
      expect(btn).toBeDisabled()
    })

    it('renders disabled Saved button when location is library', () => {
      render(<CardHeader title="A" location="library" onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Saved' })).toBeDisabled()
    })

    it('does not render save indicator when onSaveToShelf is absent', () => {
      render(<CardHeader title="A" location="none" />)
      expect(screen.queryByRole('button', { name: 'Save card' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saved' })).not.toBeInTheDocument()
    })

    it('calls onSaveToShelf when Save card is clicked', async () => {
      const onSaveToShelf = vi.fn()
      render(<CardHeader title="A" location="none" onSaveToShelf={onSaveToShelf} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save card' }))
      expect(onSaveToShelf).toHaveBeenCalledOnce()
    })
  })

  describe('close button', () => {
    it('renders Remove card button when onClose is provided', () => {
      render(<CardHeader title="A" onClose={() => {}} />)
      expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
    })

    it('does not render Remove card button when onClose is not provided', () => {
      render(<CardHeader title="A" />)
      expect(screen.queryByRole('button', { name: 'Remove card' })).not.toBeInTheDocument()
    })

    it('clicking Remove card shows delete confirmation instead of calling onClose', async () => {
      const onClose = vi.fn()
      render(<CardHeader title="A" onClose={onClose} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.getByText('Delete forever?')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Cancel delete' })).toBeInTheDocument()
    })

    it('confirming delete calls onClose', async () => {
      const onClose = vi.fn()
      render(<CardHeader title="A" onClose={onClose} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('cancelling delete hides the confirmation and does not call onClose', async () => {
      const onClose = vi.fn()
      render(<CardHeader title="A" onClose={onClose} />)
      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Cancel delete' }))
      expect(onClose).not.toHaveBeenCalled()
      expect(screen.queryByText('Delete forever?')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
    })
  })

  describe('send to dock', () => {
    it('renders Move to dock button when onSendToDock is provided', () => {
      render(<CardHeader title="A" onSendToDock={() => {}} />)
      expect(screen.getByRole('button', { name: 'Move to dock' })).toBeInTheDocument()
    })

    it('does not render Move to dock button when onSendToDock is absent', () => {
      render(<CardHeader title="A" />)
      expect(screen.queryByRole('button', { name: 'Move to dock' })).not.toBeInTheDocument()
    })

    it('calls onSendToDock when Move to dock is clicked', async () => {
      const onSendToDock = vi.fn()
      render(<CardHeader title="A" onSendToDock={onSendToDock} />)
      await userEvent.click(screen.getByRole('button', { name: 'Move to dock' }))
      expect(onSendToDock).toHaveBeenCalledOnce()
    })
  })

  describe('send to tab', () => {
    it('renders Move to tab button when onSendToTab is provided', () => {
      render(<CardHeader title="A" onSendToTab={() => {}} />)
      expect(screen.getByRole('button', { name: 'Move to tab' })).toBeInTheDocument()
    })

    it('does not render Move to tab button when onSendToTab is absent', () => {
      render(<CardHeader title="A" />)
      expect(screen.queryByRole('button', { name: 'Move to tab' })).not.toBeInTheDocument()
    })

    it('calls onSendToTab when Move to tab is clicked', async () => {
      const onSendToTab = vi.fn()
      render(<CardHeader title="A" onSendToTab={onSendToTab} />)
      await userEvent.click(screen.getByRole('button', { name: 'Move to tab' }))
      expect(onSendToTab).toHaveBeenCalledOnce()
    })
  })

  describe('does not render removed controls', () => {
    it('ignores onMoveUp / onMoveDown (removed from API)', () => {
      render(<CardHeader title="A" />)
      expect(screen.queryByRole('button', { name: 'Move card up' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Move card down' })).not.toBeInTheDocument()
    })

    it('ignores flip props (removed from API)', () => {
      render(<CardHeader title="A" />)
      expect(screen.queryByRole('button', { name: 'Show card back' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Show card front' })).not.toBeInTheDocument()
    })
  })
})
