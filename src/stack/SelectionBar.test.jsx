import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionBar } from './SelectionBar'

describe('SelectionBar', () => {
  it('renders the count label', () => {
    render(<SelectionBar count={3} onClear={() => {}} />)
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('Create Stack button is disabled when count is 1', () => {
    render(<SelectionBar count={1} onCreateStack={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Create stack from selection' })).toBeDisabled()
  })

  it('Create Stack button is disabled when count is 0', () => {
    render(<SelectionBar count={0} onCreateStack={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Create stack from selection' })).toBeDisabled()
  })

  it('Create Stack button is enabled when count is 2', () => {
    render(<SelectionBar count={2} onCreateStack={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Create stack from selection' })).toBeEnabled()
  })

  it('Create Stack button is enabled when count is greater than 2', () => {
    render(<SelectionBar count={5} onCreateStack={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Create stack from selection' })).toBeEnabled()
  })

  it('calls onCreateStack when Create Stack is clicked', async () => {
    const onCreateStack = vi.fn()
    render(<SelectionBar count={3} onCreateStack={onCreateStack} onClear={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Create stack from selection' }))
    expect(onCreateStack).toHaveBeenCalledOnce()
  })

  it('calls onClear when Clear is clicked', async () => {
    const onClear = vi.fn()
    render(<SelectionBar count={2} onClear={onClear} />)
    await userEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onClear).toHaveBeenCalledOnce()
  })

  it('renders Move button when onMove is provided', () => {
    render(<SelectionBar count={2} onMove={() => {}} onClear={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move selection' })).toBeInTheDocument()
  })

  it('does not render Move button when onMove is not provided', () => {
    render(<SelectionBar count={2} onClear={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Move selection' })).not.toBeInTheDocument()
  })

  it('calls onMove when Move is clicked', async () => {
    const onMove = vi.fn()
    render(<SelectionBar count={2} onMove={onMove} onClear={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move selection' }))
    expect(onMove).toHaveBeenCalledOnce()
  })

  it('has toolbar role and accessible label', () => {
    render(<SelectionBar count={1} onClear={() => {}} />)
    expect(screen.getByRole('toolbar', { name: 'Selection actions' })).toBeInTheDocument()
  })
})
