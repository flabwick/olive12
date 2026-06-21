import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrainFeedItem } from './BrainFeedItem'

describe('BrainFeedItem', () => {
  it('renders the card title', () => {
    render(
      <BrainFeedItem cardId="c1" title="My note" reason="stale" onReindex={() => {}} />,
    )
    expect(screen.getByText('My note')).toBeInTheDocument()
  })

  it('renders Stale badge for stale reason', () => {
    render(
      <BrainFeedItem cardId="c1" title="My note" reason="stale" onReindex={() => {}} />,
    )
    expect(screen.getByText('Stale')).toHaveClass('brain-feed-item__badge--stale')
  })

  it('renders Orphan badge for orphan reason', () => {
    render(
      <BrainFeedItem cardId="c1" title="My note" reason="orphan" onReindex={() => {}} />,
    )
    expect(screen.getByText('Orphan')).toHaveClass('brain-feed-item__badge--orphan')
  })

  it('calls onReindex with cardId when Re-index is clicked', async () => {
    const onReindex = vi.fn()
    render(
      <BrainFeedItem cardId="c1" title="My note" reason="stale" onReindex={onReindex} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Re-index My note' }))
    expect(onReindex).toHaveBeenCalledWith('c1')
  })

  it('does not render Re-index button when onReindex is not provided', () => {
    render(<BrainFeedItem cardId="c1" title="My note" reason="stale" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders Accept button when onAccept is provided', () => {
    render(<BrainFeedItem cardId="c1" title="My note" reason="stale" onAccept={() => {}} />)
    expect(screen.getByRole('button', { name: 'Accept' })).toBeInTheDocument()
  })

  it('calls onAccept with cardId when Accept is clicked', async () => {
    const onAccept = vi.fn()
    render(<BrainFeedItem cardId="c1" title="My note" reason="stale" onAccept={onAccept} />)
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }))
    expect(onAccept).toHaveBeenCalledWith('c1')
  })

  it('renders Dismiss button when onDismiss is provided', () => {
    render(<BrainFeedItem cardId="c1" title="My note" reason="stale" onDismiss={() => {}} />)
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()
  })

  it('calls onDismiss with cardId when Dismiss is clicked', async () => {
    const onDismiss = vi.fn()
    render(<BrainFeedItem cardId="c1" title="My note" reason="stale" onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledWith('c1')
  })
})
