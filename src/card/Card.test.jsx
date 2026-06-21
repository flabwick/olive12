import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Card } from './Card'

// Replace Tiptap with a plain textarea so Card tests focus on Card logic,
// not ProseMirror internals. RichTextEditor has its own test file.
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ value, onChange, editable, ariaLabel }) => (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel}
      readOnly={!editable}
    />
  ),
}))

describe('Card', () => {
  it('renders the title and body', () => {
    render(<Card title="Meeting notes" body="Discuss roadmap" />)

    expect(screen.getByRole('heading', { level: 3, name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Card body' })).toHaveValue('Discuss roadmap')
  })

  it('body textarea always present with aria-label Card body', () => {
    render(<Card title="List" body={'First line\nSecond line'} />)

    expect(screen.getByRole('textbox', { name: 'Card body' })).toHaveValue('First line\nSecond line')
  })

  it('hides body when foldState is true', () => {
    render(<Card title="Folded" body="Hidden body" foldState={true} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Folded' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Card body' })).not.toBeInTheDocument()
  })

  it('shows body when foldState is false', () => {
    render(<Card title="Visible" body="Visible body" foldState={false} />)

    expect(screen.getByRole('textbox', { name: 'Card body' })).toHaveValue('Visible body')
  })

  it('applies card--hidden class when hiddenState is true', () => {
    render(<Card title="Ghost" body="Ghost body" hiddenState={true} />)

    const card = screen.getByRole('heading', { level: 3, name: 'Ghost' }).closest('.card')
    expect(card).toHaveClass('card--hidden')
  })

  it('does not apply card--hidden class when hiddenState is false', () => {
    render(<Card title="Visible" body="Visible body" hiddenState={false} />)

    const card = screen.getByRole('heading', { level: 3, name: 'Visible' }).closest('.card')
    expect(card).not.toHaveClass('card--hidden')
  })

  it('renders no control buttons when no callbacks are provided', () => {
    render(<Card title="Plain" body="No controls" />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('calls onToggleFold when the caret button is clicked', async () => {
    const onToggleFold = vi.fn()
    render(<Card title="A" body="B" onToggleFold={onToggleFold} />)

    await userEvent.click(screen.getByRole('button', { name: 'Collapse card' }))
    expect(onToggleFold).toHaveBeenCalledOnce()
  })

  it('calls onToggleHide when the eye button is clicked', async () => {
    const onToggleHide = vi.fn()
    render(<Card title="A" body="B" onToggleHide={onToggleHide} />)

    await userEvent.click(screen.getByRole('button', { name: 'Dim card' }))
    expect(onToggleHide).toHaveBeenCalledOnce()
  })

  it('shows Expand label on caret when foldState is true', () => {
    render(<Card title="A" body="B" foldState={true} onToggleFold={() => {}} />)

    expect(screen.getByRole('button', { name: 'Expand card' })).toBeInTheDocument()
  })

  it('shows Show label on eye when hiddenState is true', () => {
    render(<Card title="A" body="B" hiddenState={true} onToggleHide={() => {}} />)

    expect(screen.getByRole('button', { name: 'Show card' })).toBeInTheDocument()
  })

  it('renders Move card up button when onMoveUp is provided', () => {
    render(<Card title="A" body="B" onMoveUp={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move card up' })).toBeInTheDocument()
  })

  it('renders Move card down button when onMoveDown is provided', () => {
    render(<Card title="A" body="B" onMoveDown={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move card down' })).toBeInTheDocument()
  })

  it('calls onMoveUp when up button is clicked', async () => {
    const onMoveUp = vi.fn()
    render(<Card title="A" body="B" onMoveUp={onMoveUp} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card up' }))
    expect(onMoveUp).toHaveBeenCalledOnce()
  })

  it('calls onMoveDown when down button is clicked', async () => {
    const onMoveDown = vi.fn()
    render(<Card title="A" body="B" onMoveDown={onMoveDown} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card down' }))
    expect(onMoveDown).toHaveBeenCalledOnce()
  })

  it('renders Remove card button when onClose is provided', () => {
    render(<Card title="A" body="B" onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Remove card' })).toBeInTheDocument()
  })

  it('calls onClose when Remove card button is clicked', async () => {
    const onClose = vi.fn()
    render(<Card title="A" body="B" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  describe('resize handle', () => {
    it('renders a resize handle when not folded', () => {
      render(<Card title="T" body="B" />)
      expect(screen.getByRole('separator', { name: 'Resize card' })).toBeInTheDocument()
    })

    it('does not render a resize handle when folded', () => {
      render(<Card title="T" body="B" foldState={true} />)
      expect(screen.queryByRole('separator', { name: 'Resize card' })).not.toBeInTheDocument()
    })
  })

  describe('inline editing', () => {
    it('title heading is focusable when onUpdate is provided', () => {
      render(<Card title="My title" body="B" onUpdate={() => {}} />)
      expect(screen.getByRole('heading', { level: 3, name: 'My title' })).toHaveAttribute('tabindex', '0')
    })

    it('clicking the title enters edit mode — title input appears', async () => {
      render(<Card title="My title" body="B" onUpdate={() => {}} />)
      await userEvent.click(screen.getByRole('heading', { level: 3, name: 'My title' }))
      expect(screen.getByRole('textbox', { name: 'Card title' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Card body' })).not.toHaveAttribute('readonly')
    })

    it('title heading has no tabindex when onUpdate is not provided', () => {
      render(<Card title="My title" body="B" />)
      expect(screen.getByRole('heading', { level: 3, name: 'My title' })).not.toHaveAttribute('tabindex')
    })

    it('body textarea is always visible with aria-label Card body', () => {
      render(<Card title="T" body="B" onUpdate={() => {}} />)
      expect(screen.getByRole('textbox', { name: 'Card body' })).toBeInTheDocument()
    })

    it('clicking the body area enters edit mode', async () => {
      render(<Card title="T" body="Body text" onUpdate={() => {}} />)
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      expect(screen.getByRole('textbox', { name: 'Card title' })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Card body' })).not.toHaveAttribute('readonly')
    })

    it('entering edit mode shows draft title and body values', async () => {
      render(<Card title="My title" body="My body" onUpdate={() => {}} />)
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      expect(screen.getByDisplayValue('My title')).toBeInTheDocument()
      expect(screen.getByDisplayValue('My body')).toBeInTheDocument()
    })

    it('calls onUpdate with new values when focus leaves the card', async () => {
      const onUpdate = vi.fn()
      render(
        <div>
          <Card title="T" body="Old body" onUpdate={onUpdate} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      const textarea = screen.getByRole('textbox', { name: 'Card body' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'New body')
      await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
      expect(onUpdate).toHaveBeenCalledWith({ title: 'T', body: 'New body' })
    })

    it('does not call onUpdate when values are unchanged on blur', async () => {
      const onUpdate = vi.fn()
      render(
        <div>
          <Card title="T" body="B" onUpdate={onUpdate} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
      expect(onUpdate).not.toHaveBeenCalled()
    })

    it('pressing Escape cancels editing and body reverts to readOnly with original value', async () => {
      render(<Card title="T" body="B" onUpdate={() => {}} />)
      await userEvent.click(screen.getByRole('textbox', { name: 'Card body' }))
      const textarea = screen.getByRole('textbox', { name: 'Card body' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Changed')
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('textbox', { name: 'Card title' })).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Card body' })).toHaveValue('B')
    })

    it('body is readOnly when onUpdate is not provided', () => {
      render(<Card title="T" body="B" />)
      expect(screen.getByRole('textbox', { name: 'Card body' })).toHaveAttribute('readonly')
    })
  })

  describe('flip', () => {
    it('flip button is present when onFlip is provided, regardless of back content', () => {
      render(<Card title="Q" body="Some body" back="" onFlip={() => {}} />)
      expect(screen.getByRole('button', { name: 'Show card back' })).toBeInTheDocument()
    })

    it('flip button is present even when back has content', () => {
      render(<Card title="Q" body="Some body" back="The answer" onFlip={() => {}} />)
      expect(screen.getByRole('button', { name: 'Show card back' })).toBeInTheDocument()
    })

    it('flip button is absent when onFlip is not provided', () => {
      render(<Card title="Q" body="Some body" back="The answer" />)
      expect(screen.queryByRole('button', { name: 'Show card back' })).not.toBeInTheDocument()
    })

    it('flip button calls onFlip when clicked', async () => {
      const onFlip = vi.fn()
      render(<Card title="Q" body="Some body" back="The answer" onFlip={onFlip} />)
      await userEvent.click(screen.getByRole('button', { name: 'Show card back' }))
      expect(onFlip).toHaveBeenCalledOnce()
    })

    it('flipped=true renders CardBack instead of body', () => {
      render(<Card title="Q" body="Front body" back="Back content" flipped={true} onFlip={() => {}} />)
      expect(screen.queryByRole('textbox', { name: 'Card body' })).not.toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: 'Card back' })).toHaveValue('Back content')
      expect(screen.getByRole('button', { name: 'Flip to front' })).toBeInTheDocument()
    })

    it('flipped=true hides the resize handle', () => {
      render(<Card title="Q" body="B" back="Back" flipped={true} onFlip={() => {}} />)
      expect(screen.queryByRole('separator', { name: 'Resize card' })).not.toBeInTheDocument()
    })

    it('card--flipped class is applied when flipped is true', () => {
      render(<Card title="Q" body="B" back="Back" flipped={true} onFlip={() => {}} />)
      const card = screen.getByRole('heading', { level: 3, name: 'Q' }).closest('.card')
      expect(card).toHaveClass('card--flipped')
    })

    it('card--flipped class is absent when flipped is false', () => {
      render(<Card title="Q" body="B" back="Back" flipped={false} onFlip={() => {}} />)
      const card = screen.getByRole('heading', { level: 3, name: 'Q' }).closest('.card')
      expect(card).not.toHaveClass('card--flipped')
    })

    it('editing the back face calls onUpdate with { back } on blur', async () => {
      const onUpdate = vi.fn()
      render(
        <div>
          <Card title="Q" body="B" back="Old back" flipped={true} onFlip={() => {}} onUpdate={onUpdate} />
          <button type="button">Outside</button>
        </div>,
      )
      await userEvent.click(screen.getByRole('textbox', { name: 'Card back' }))
      const textarea = screen.getByRole('textbox', { name: 'Card back' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'New back')
      await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
      expect(onUpdate).toHaveBeenCalledWith({ back: 'New back' })
    })

    it('Escape cancels back edit without calling onUpdate', async () => {
      const onUpdate = vi.fn()
      render(<Card title="Q" body="B" back="Original" flipped={true} onFlip={() => {}} onUpdate={onUpdate} />)
      await userEvent.click(screen.getByRole('textbox', { name: 'Card back' }))
      const textarea = screen.getByRole('textbox', { name: 'Card back' })
      await userEvent.clear(textarea)
      await userEvent.type(textarea, 'Changed')
      await userEvent.keyboard('{Escape}')
      expect(onUpdate).not.toHaveBeenCalled()
      expect(screen.getByRole('textbox', { name: 'Card back' })).toHaveValue('Original')
    })
  })

  describe('location', () => {
    it('renders + button when location is "none" and onSaveToShelf is provided', () => {
      render(<Card title="T" body="B" location="none" onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save to Shelf' })).toBeInTheDocument()
    })

    it('calls onSaveToShelf when + is clicked', async () => {
      const onSaveToShelf = vi.fn()
      render(<Card title="T" body="B" location="none" onSaveToShelf={onSaveToShelf} />)
      await userEvent.click(screen.getByRole('button', { name: 'Save to Shelf' }))
      expect(onSaveToShelf).toHaveBeenCalledOnce()
    })

    it('renders no location button when location is "shelf"', () => {
      render(<Card title="T" body="B" location="shelf" onMoveToLibrary={() => {}} />)
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
    })

    it('renders no location button when location is "library"', () => {
      render(<Card title="T" body="B" location="library" />)
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
    })

    it('renders no location button when callbacks are not provided', () => {
      render(<Card title="T" body="B" location="none" />)
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
    })

    it('+ button visible when card is folded', () => {
      render(<Card title="T" body="B" location="none" foldState={true} onSaveToShelf={() => {}} />)
      expect(screen.getByRole('button', { name: 'Save to Shelf' })).toBeInTheDocument()
    })
  })
})
