import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BrainFeedList } from './BrainFeedList'

describe('BrainFeedList', () => {
  it('shows empty state when items is empty', () => {
    render(<BrainFeedList items={[]} onReindex={() => {}} />)
    expect(screen.getByText('No issues found.')).toBeInTheDocument()
  })

  it('renders a BrainFeedItem for each item', () => {
    const items = [
      { cardId: 'c1', title: 'Alpha', reason: 'stale' },
      { cardId: 'c2', title: 'Beta', reason: 'orphan' },
    ]
    render(<BrainFeedList items={items} onReindex={() => {}} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Brain feed' })).toBeInTheDocument()
  })

  it('forwards onReindex to items', async () => {
    const onReindex = vi.fn()
    const items = [{ cardId: 'c1', title: 'Alpha', reason: 'stale' }]
    render(<BrainFeedList items={items} onReindex={onReindex} />)
    await userEvent.click(screen.getByRole('button', { name: 'Re-index Alpha' }))
    expect(onReindex).toHaveBeenCalledWith('c1')
  })
})
