import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('renders the dock with an Add card button', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
  })

  it('opens the transient card when Add card is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add →/i })).toBeInTheDocument()
  })

  it('disables the dock + button while transient card is open', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
  })

  it('submitting the transient card creates a card and closes the form', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await userEvent.type(screen.getByLabelText('Title'), 'My note')
    await userEvent.type(screen.getByLabelText('Body'), 'Some body')
    await userEvent.click(screen.getByRole('button', { name: /add →/i }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'My note' })).toBeInTheDocument()
  })

  it('cancelling the transient card closes it without adding a card', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByText('No cards yet.')).toBeInTheDocument()
  })
})
