import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrainFeedItem } from './BrainFeedItem'

const baseProps = {
  cardId: 'card-1',
  title: 'My note',
  reason: 'stale',
  onAccept: () => {},
  onDismiss: () => {},
}

describe('BrainFeedItem', () => {
  it('renders the card title', () => {
    render(<BrainFeedItem {...baseProps} />)
    expect(screen.getByText('My note')).toBeInTheDocument()
  })

  it('renders the Stale badge for stale reason', () => {
    render(<BrainFeedItem {...baseProps} reason="stale" />)
    expect(screen.getByText('Stale')).toBeInTheDocument()
  })

  it('renders the Orphan badge for orphan reason', () => {
    render(<BrainFeedItem {...baseProps} reason="orphan" />)
    expect(screen.getByText('Orphan')).toBeInTheDocument()
  })

  it('renders fallback title when title is empty', () => {
    render(<BrainFeedItem {...baseProps} title="" />)
    expect(screen.getByText('(untitled)')).toBeInTheDocument()
  })

  it('calls onAccept with cardId when Accept is clicked', async () => {
    const onAccept = vi.fn()
    render(<BrainFeedItem {...baseProps} onAccept={onAccept} />)
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(onAccept).toHaveBeenCalledWith('card-1')
  })

  it('calls onDismiss with cardId when Dismiss is clicked', async () => {
    const onDismiss = vi.fn()
    render(<BrainFeedItem {...baseProps} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledWith('card-1')
  })
})
