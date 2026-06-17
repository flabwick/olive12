import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CardHeader } from './CardHeader'

describe('CardHeader', () => {
  it('renders the title', () => {
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

  it('renders both buttons when both callbacks are provided', () => {
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
})
