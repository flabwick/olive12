import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SelectionToolbar } from './SelectionToolbar'

describe('SelectionToolbar', () => {
  it('shows the selected count', () => {
    render(<SelectionToolbar count={3} onMove={vi.fn()} onDelete={vi.fn()} onDone={vi.fn()} />)
    expect(screen.getByText('3 selected')).toBeInTheDocument()
  })

  it('renders Move and Delete and Done buttons', () => {
    render(<SelectionToolbar count={2} onMove={vi.fn()} onDelete={vi.fn()} onDone={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('calls onMove when Move is clicked', async () => {
    const onMove = vi.fn()
    render(<SelectionToolbar count={1} onMove={onMove} onDelete={vi.fn()} onDone={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move' }))
    expect(onMove).toHaveBeenCalledOnce()
  })

  it('shows confirm delete button after first Delete click', async () => {
    render(<SelectionToolbar count={1} onMove={vi.fn()} onDelete={vi.fn()} onDone={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
  })

  it('calls onDelete after confirming delete', async () => {
    const onDelete = vi.fn()
    render(<SelectionToolbar count={1} onMove={vi.fn()} onDelete={onDelete} onDone={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('calls onDone when Done is clicked', async () => {
    const onDone = vi.fn()
    render(<SelectionToolbar count={0} onMove={vi.fn()} onDelete={vi.fn()} onDone={onDone} />)
    await userEvent.click(screen.getByRole('button', { name: 'Done' }))
    expect(onDone).toHaveBeenCalledOnce()
  })

  it('disables Move and Delete when count is 0', () => {
    render(<SelectionToolbar count={0} onMove={vi.fn()} onDelete={vi.fn()} onDone={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Move' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled()
  })
})
