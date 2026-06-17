import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Card } from './Card'

describe('Card', () => {
  it('renders the title and body', () => {
    render(<Card title="Meeting notes" body="Discuss roadmap" />)

    expect(screen.getByRole('heading', { level: 3, name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.getByText('Discuss roadmap')).toBeInTheDocument()
  })

  it('preserves line breaks in the body', () => {
    render(<Card title="List" body={'First line\nSecond line'} />)

    expect(screen.getByText(/First line/)).toHaveClass('card__body')
    expect(screen.getByText((_, element) => element?.textContent === 'First line\nSecond line')).toBeInTheDocument()
  })

  it('hides body when foldState is true', () => {
    render(<Card title="Folded" body="Hidden body" foldState={true} />)

    expect(screen.getByRole('heading', { level: 3, name: 'Folded' })).toBeInTheDocument()
    expect(screen.queryByText('Hidden body')).not.toBeInTheDocument()
  })

  it('shows body when foldState is false', () => {
    render(<Card title="Visible" body="Visible body" foldState={false} />)

    expect(screen.getByText('Visible body')).toBeInTheDocument()
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
})
