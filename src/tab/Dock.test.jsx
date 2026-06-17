import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dock } from './Dock'

describe('Dock', () => {
  it('renders an Add card button', () => {
    render(<Dock />)
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
  })

  it('calls onAdd when + button is clicked', async () => {
    const onAdd = vi.fn()
    render(<Dock onAdd={onAdd} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('disables the Add button when addDisabled is true', () => {
    render(<Dock addDisabled={true} />)
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
  })

  it('enables the Add button when addDisabled is false', () => {
    render(<Dock addDisabled={false} />)
    expect(screen.getByRole('button', { name: 'Add card' })).not.toBeDisabled()
  })

  it('does not call onAdd when button is disabled', async () => {
    const onAdd = vi.fn()
    render(<Dock onAdd={onAdd} addDisabled={true} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onAdd).not.toHaveBeenCalled()
  })
})
