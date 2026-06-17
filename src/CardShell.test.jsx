import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db/vaultDb'
import CardShell from './CardShell'

describe('CardShell', () => {
  beforeEach(async () => {
    await db.cards.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a card through the UI', async () => {
    const user = userEvent.setup()
    render(<CardShell />)

    await user.type(screen.getByLabelText('Title'), 'Meeting notes')
    await user.type(screen.getByLabelText('Body'), 'Discuss roadmap')
    await user.click(screen.getByRole('button', { name: /add card/i }))

    await waitFor(() => screen.getByRole('heading', { level: 3, name: 'Meeting notes' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.getByText('Discuss roadmap')).toBeInTheDocument()
  })

  it('reloads cards after remount', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<CardShell />)

    await user.type(screen.getByLabelText('Title'), 'Saved card')
    await user.type(screen.getByLabelText('Body'), 'Survives refresh')
    await user.click(screen.getByRole('button', { name: /add card/i }))

    await waitFor(() => screen.getByRole('heading', { level: 3, name: 'Saved card' }))
    unmount()
    render(<CardShell />)

    await waitFor(() => screen.getByRole('heading', { level: 3, name: 'Saved card' }))
    expect(screen.getByRole('heading', { level: 3, name: 'Saved card' })).toBeInTheDocument()
    expect(screen.getByText('Survives refresh')).toBeInTheDocument()
  })
})
