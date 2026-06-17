import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from './db/vaultDb'
import App from './App'

describe('App', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
  })

  afterEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
  })

  it('renders the dock with an Add card button', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
  })

  it('opens the transient card when Add card is clicked', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add →/i })).toBeInTheDocument()
  })

  it('disables the dock + button while transient card is open', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
  })

  it('submitting the transient card creates a card and closes the form', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await userEvent.type(screen.getByLabelText('Title'), 'My note')
    await userEvent.type(screen.getByLabelText('Body'), 'Some body')
    await userEvent.click(screen.getByRole('button', { name: /add →/i }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    await waitFor(() => screen.getByRole('heading', { name: 'My note' }))
    expect(screen.getByRole('heading', { name: 'My note' })).toBeInTheDocument()
  })

  it('cancelling the transient card closes it without adding a card', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByText('No cards yet.')).toBeInTheDocument()
  })

  it('mounts with tab view active', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('tab', { name: 'Tab' }))
    expect(screen.getByRole('tab', { name: 'Tab' })).toHaveAttribute('aria-selected', 'true')
  })

  it('clicking Shelf switches to shelf empty state', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('tab', { name: 'Shelf' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Shelf' }))
    expect(
      screen.getByText('Shelf is empty. Save some cards from your tab.'),
    ).toBeInTheDocument()
  })

  it('clicking Library switches to library view', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('tab', { name: 'Library' }))
    await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
    expect(screen.getByRole('tree', { name: 'Library' })).toBeInTheDocument()
  })
})
