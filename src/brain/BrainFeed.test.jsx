import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrainFeed } from './BrainFeed'

const items = [
  { cardId: 'c1', title: 'Project overview', reason: 'stale' },
  { cardId: 'c2', title: 'Meeting notes', reason: 'orphan' },
]

describe('BrainFeed', () => {
  it('renders all items', () => {
    render(<BrainFeed items={items} onAccept={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText('Project overview')).toBeInTheDocument()
    expect(screen.getByText('Meeting notes')).toBeInTheDocument()
  })

  it('renders the empty state when items is empty', () => {
    render(<BrainFeed items={[]} onAccept={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText('No maintenance needed.')).toBeInTheDocument()
  })

  it('renders empty state when items prop is omitted', () => {
    render(<BrainFeed onAccept={() => {}} onDismiss={() => {}} />)
    expect(screen.getByText('No maintenance needed.')).toBeInTheDocument()
  })

  it('forwards onAccept to each item', async () => {
    const onAccept = vi.fn()
    render(<BrainFeed items={items} onAccept={onAccept} onDismiss={() => {}} />)
    const acceptBtns = screen.getAllByRole('button', { name: 'Accept' })
    await userEvent.click(acceptBtns[0])
    expect(onAccept).toHaveBeenCalledWith('c1')
  })

  it('forwards onDismiss to each item', async () => {
    const onDismiss = vi.fn()
    render(<BrainFeed items={items} onAccept={() => {}} onDismiss={onDismiss} />)
    const dismissBtns = screen.getAllByRole('button', { name: 'Dismiss' })
    await userEvent.click(dismissBtns[1])
    expect(onDismiss).toHaveBeenCalledWith('c2')
  })
})
