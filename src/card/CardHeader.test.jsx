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

  it('renders only the caret button when only onToggleFold is provided', () => {
    render(<CardHeader title="A" onToggleFold={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute('aria-label', 'Collapse card')
  })

  it('renders only the eye button when only onToggleHide is provided', () => {
    render(<CardHeader title="A" onToggleHide={() => {}} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]).toHaveAttribute('aria-label', 'Dim card')
  })

  it('renders both buttons when both fold/hide callbacks are provided', () => {
    render(<CardHeader title="A" onToggleFold={() => {}} onToggleHide={() => {}} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })

  it('calls onToggleFold when caret button is clicked', async () => {
    const onToggleFold = vi.fn()
    render(<CardHeader title="A" onToggleFold={onToggleFold} />)
    await userEvent.click(screen.getByRole('button', { name: 'Collapse card' }))
    expect(onToggleFold).toHaveBeenCalledOnce()
  })

  it('calls onToggleHide when eye button is clicked', async () => {
    const onToggleHide = vi.fn()
    render(<CardHeader title="A" onToggleHide={onToggleHide} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dim card' }))
    expect(onToggleHide).toHaveBeenCalledOnce()
  })

  it('shows Expand label on caret when folded is true', () => {
    render(<CardHeader title="A" folded={true} onToggleFold={() => {}} />)
    expect(screen.getByRole('button', { name: 'Expand card' })).toBeInTheDocument()
  })

  it('shows Show label on eye when hidden is true', () => {
    render(<CardHeader title="A" hidden={true} onToggleHide={() => {}} />)
    expect(screen.getByRole('button', { name: 'Show card' })).toBeInTheDocument()
  })

  it('renders Move card up button when onMoveUp is provided', () => {
    render(<CardHeader title="A" onMoveUp={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move card up' })).toBeInTheDocument()
  })

  it('renders Move card down button when onMoveDown is provided', () => {
    render(<CardHeader title="A" onMoveDown={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move card down' })).toBeInTheDocument()
  })

  it('does not render up button when onMoveUp is not provided', () => {
    render(<CardHeader title="A" onMoveDown={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Move card up' })).not.toBeInTheDocument()
  })

  it('does not render down button when onMoveDown is not provided', () => {
    render(<CardHeader title="A" onMoveUp={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Move card down' })).not.toBeInTheDocument()
  })

  it('calls onMoveUp when up button is clicked', async () => {
    const onMoveUp = vi.fn()
    render(<CardHeader title="A" onMoveUp={onMoveUp} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card up' }))
    expect(onMoveUp).toHaveBeenCalledOnce()
  })

  it('calls onMoveDown when down button is clicked', async () => {
    const onMoveDown = vi.fn()
    render(<CardHeader title="A" onMoveDown={onMoveDown} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card down' }))
    expect(onMoveDown).toHaveBeenCalledOnce()
  })

  it('renders four buttons when all callbacks are provided', () => {
    render(
      <CardHeader
        title="A"
        onMoveUp={() => {}}
        onMoveDown={() => {}}
        onToggleFold={() => {}}
        onToggleHide={() => {}}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(4)
  })

  it('renders title as input when editing is true', () => {
    render(<CardHeader title="My card" editing={true} onTitleChange={() => {}} />)
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Card title' })).toHaveValue('My card')
  })

  it('renders Remove card button when onClose is provided', () => {
    render(<CardHeader title="A" onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
  })

  it('does not render Remove card button when onClose is not provided', () => {
    render(<CardHeader title="A" />)
    expect(screen.queryByRole('button', { name: 'Remove card' })).not.toBeInTheDocument()
  })

  it('calls onClose when Remove card button is clicked', async () => {
    const onClose = vi.fn()
    render(<CardHeader title="A" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onTitleChange when title input changes', async () => {
    const onTitleChange = vi.fn()
    render(<CardHeader title="Old" editing={true} onTitleChange={onTitleChange} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Card title' }), '!')
    expect(onTitleChange).toHaveBeenCalled()
  })

  describe('location button', () => {
    it('renders Save to Shelf button when location is none and onSaveToShelf is provided', () => {
      render(<CardHeader title="A" location="none" onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save to Shelf' })).toBeInTheDocument()
    })

    it('renders no location button when no callbacks are provided', () => {
      render(<CardHeader title="A" location="none" />)
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
    })

    it('renders no location button when location is shelf', () => {
      render(<CardHeader title="A" location="shelf" onMoveToLibrary={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
    })

    it('renders no location button when location is library', () => {
      render(<CardHeader title="A" location="library" />)
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
    })

    it('calls onSaveToShelf when Save to Shelf is clicked', async () => {
      const onSaveToShelf = vi.fn()
      render(<CardHeader title="A" location="none" onSaveToShelf={onSaveToShelf} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save to Shelf' }))
      expect(onSaveToShelf).toHaveBeenCalledOnce()
    })
  })

  describe('flip', () => {
    it('renders Flip card button when onFlip is provided', () => {
      render(<CardHeader title="Q" onFlip={() => {}} />)
      expect(screen.getByRole('button', { name: 'Flip card' })).toBeInTheDocument()
    })

    it('does not render Flip card button when onFlip is absent', () => {
      render(<CardHeader title="Q" />)
      expect(screen.queryByRole('button', { name: 'Flip card' })).not.toBeInTheDocument()
    })

    it('calls onFlip when Flip card is clicked', async () => {
      const onFlip = vi.fn()
      render(<CardHeader title="Q" onFlip={onFlip} />)
      await userEvent.click(screen.getByRole('button', { name: 'Flip card' }))
      expect(onFlip).toHaveBeenCalledOnce()
    })

    it('flip button has aria-pressed=true when flipped', () => {
      render(<CardHeader title="Q" onFlip={() => {}} flipped={true} />)
      expect(screen.getByRole('button', { name: 'Flip card' })).toHaveAttribute('aria-pressed', 'true')
    })
  })
})
