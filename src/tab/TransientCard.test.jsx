import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransientCard } from './TransientCard'

describe('TransientCard', () => {
  it('renders a title input and body textarea', () => {
    render(<TransientCard />)
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Body')).toBeInTheDocument()
  })

  it('renders card type buttons', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Process' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Portal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Container' })).toBeInTheDocument()
  })

  it('Text type button is enabled and selected by default', () => {
    render(<TransientCard />)
    const text = screen.getByRole('button', { name: 'Text' })
    expect(text).not.toBeDisabled()
    expect(text).toHaveAttribute('aria-pressed', 'true')
  })

  it('non-Text type buttons are disabled', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: 'Process' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Portal' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Container' })).toBeDisabled()
  })

  it('calls onSubmit with title and body on submit', async () => {
    const onSubmit = vi.fn()
    render(<TransientCard onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Title'), 'My note')
    await userEvent.type(screen.getByLabelText('Body'), 'Some content')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'My note', body: 'Some content' })
  })

  it('calls onDismiss when Cancel is clicked', async () => {
    const onDismiss = vi.fn()
    render(<TransientCard onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when Dismiss (✕) is clicked', async () => {
    const onDismiss = vi.fn()
    render(<TransientCard onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('renders an Add button', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('calls onSubmit with empty strings if nothing typed', async () => {
    const onSubmit = vi.fn()
    render(<TransientCard onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onSubmit).toHaveBeenCalledWith({ title: '', body: '' })
  })
})
