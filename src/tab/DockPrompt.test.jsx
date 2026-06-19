import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DockPrompt } from './DockPrompt'

describe('DockPrompt', () => {
  it('renders the prompt textarea and action buttons', () => {
    render(<DockPrompt />)
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send →' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('Send button is disabled when input is empty', () => {
    render(<DockPrompt />)
    expect(screen.getByRole('button', { name: 'Send →' })).toBeDisabled()
  })

  it('Send button enables after typing', async () => {
    render(<DockPrompt />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), 'hello')
    expect(screen.getByRole('button', { name: 'Send →' })).not.toBeDisabled()
  })

  it('calls onSubmit with trimmed text when Send is clicked', async () => {
    const onSubmit = vi.fn()
    render(<DockPrompt onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), '  my prompt  ')
    await userEvent.click(screen.getByRole('button', { name: 'Send →' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith('my prompt')
  })

  it('calls onDismiss when Cancel is clicked', async () => {
    const onDismiss = vi.fn()
    render(<DockPrompt onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('does not call onSubmit when input is whitespace-only', async () => {
    const onSubmit = vi.fn()
    render(<DockPrompt onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Send →' }))
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows loading state: button text changes and inputs are disabled', () => {
    render(<DockPrompt loading={true} />)
    expect(screen.getByRole('button', { name: 'Thinking…' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('displays error text with alert role', () => {
    render(<DockPrompt error="Something went wrong" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('does not render error element when error is empty', () => {
    render(<DockPrompt error="" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
