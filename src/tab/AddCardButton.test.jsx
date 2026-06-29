import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AddCardButton } from './AddCardButton'

describe('AddCardButton', () => {
  it('renders the "New card" label', () => {
    render(<AddCardButton onClick={() => {}} />)
    expect(screen.getByText('New card')).toBeInTheDocument()
  })

  it('has aria-label "Add new card"', () => {
    render(<AddCardButton onClick={() => {}} />)
    expect(screen.getByRole('button', { name: 'Add new card' })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<AddCardButton onClick={onClick} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add new card' }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
