import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AIPrompt } from './AIPrompt'

describe('AIPrompt', () => {
  it('renders the prompt textarea and action buttons', () => {
    render(<AIPrompt />)
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send →' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('placeholder text matches expected copy', () => {
    render(<AIPrompt />)
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toHaveAttribute(
      'placeholder',
      'Optional — add instructions…',
    )
  })

  it('Submit button is enabled when textarea is empty', () => {
    render(<AIPrompt />)
    expect(screen.getByRole('button', { name: 'Send →' })).not.toBeDisabled()
  })

  it('Submit button remains enabled after typing', async () => {
    render(<AIPrompt />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), 'hello')
    expect(screen.getByRole('button', { name: 'Send →' })).not.toBeDisabled()
  })

  it('calls onSubmit with empty string when textarea is empty', async () => {
    const onSubmit = vi.fn()
    render(<AIPrompt onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: 'Send →' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith('')
  })

  it('calls onSubmit with empty string when input is whitespace-only', async () => {
    const onSubmit = vi.fn()
    render(<AIPrompt onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Send →' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith('')
  })

  it('calls onSubmit with trimmed text when textarea has content', async () => {
    const onSubmit = vi.fn()
    render(<AIPrompt onSubmit={onSubmit} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), '  my prompt  ')
    await userEvent.click(screen.getByRole('button', { name: 'Send →' }))
    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit).toHaveBeenCalledWith('my prompt')
  })

  it('calls onDismiss when Cancel is clicked', async () => {
    const onDismiss = vi.fn()
    render(<AIPrompt onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('shows loading state: button text changes and inputs are disabled', () => {
    render(<AIPrompt loading={true} />)
    expect(screen.getByRole('button', { name: 'Thinking…' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })

  it('shows spinner in submit button when streaming=true and loading=true', () => {
    render(<AIPrompt loading={true} streaming={true} />)
    const spinner = document.querySelector('.ai-prompt__spinner')
    expect(spinner).toBeInTheDocument()
    expect(spinner).toHaveAttribute('aria-busy', 'true')
  })

  it('shows Thinking… when loading=true and streaming=false', () => {
    render(<AIPrompt loading={true} streaming={false} />)
    expect(screen.getByRole('button', { name: 'Thinking…' })).toBeInTheDocument()
    expect(document.querySelector('.ai-prompt__spinner')).not.toBeInTheDocument()
  })

  it('displays error text with alert role', () => {
    render(<AIPrompt error="Something went wrong" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
  })

  it('does not render error element when error is empty', () => {
    render(<AIPrompt error="" />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
