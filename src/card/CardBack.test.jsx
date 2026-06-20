import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearIndexDebugEvents } from '../debug/indexPipelineDebug'
import { CardBack } from './CardBack'

describe('CardBack', () => {
  afterEach(() => {
    clearIndexDebugEvents()
  })
  it('renders the back text content', () => {
    render(<CardBack back="The back of the card" editing={false} />)
    expect(screen.getByText('The back of the card')).toBeInTheDocument()
  })

  it('renders "No notes" placeholder when back is empty', () => {
    render(<CardBack back="" editing={false} />)
    expect(screen.getByText('No notes')).toBeInTheDocument()
  })

  it('renders a Flip to front button', () => {
    render(<CardBack back="Content" editing={false} />)
    expect(screen.getByRole('button', { name: 'Flip to front' })).toBeInTheDocument()
  })

  it('flip button calls onFlip when clicked', async () => {
    const onFlip = vi.fn()
    render(<CardBack back="Content" editing={false} onFlip={onFlip} />)
    await userEvent.click(screen.getByRole('button', { name: 'Flip to front' }))
    expect(onFlip).toHaveBeenCalledOnce()
  })

  it('renders a textarea with placeholder in edit mode', () => {
    render(<CardBack back="" editing={true} />)
    expect(screen.getByRole('textbox', { name: 'Card back' })).toBeInTheDocument()
    // eslint-disable-next-line testing-library/no-node-access
    expect(document.querySelector('p.card-back__notes-text')).toBeNull()
  })

  it('calls onBackChange when textarea changes', async () => {
    const onBackChange = vi.fn()
    render(<CardBack back="" editing={true} onBackChange={onBackChange} />)
    const textarea = screen.getByRole('textbox', { name: 'Card back' })
    await userEvent.type(textarea, 'A')
    expect(onBackChange).toHaveBeenCalledWith('A')
  })

  it('renders metadata when cardId, createdAt, updatedAt are provided', () => {
    render(
      <CardBack
        back=""
        editing={false}
        cardId="abc-123"
        createdAt={new Date('2026-01-15T10:00:00').getTime()}
        updatedAt={new Date('2026-06-20T14:00:00').getTime()}
      />,
    )
    expect(screen.getByText('Created')).toBeInTheDocument()
    expect(screen.getByText('Updated')).toBeInTheDocument()
    expect(screen.getAllByText('abc-123').length).toBeGreaterThan(0)
  })

  it('renders gracefully with no metadata props', () => {
    render(<CardBack back="" editing={false} />)
    expect(screen.queryByText('Created')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Flip to front' })).toBeInTheDocument()
  })

  describe('wiki index (library cards)', () => {
    const entry = {
      cardId: 'abc-123',
      title: 'React Hooks',
      tags: ['react', 'hooks'],
      summary: 'A guide to React hooks.',
      links: ['other-card'],
    }

    it('shows index entry for library cards', () => {
      render(<CardBack back="" editing={false} location="library" indexEntry={entry} />)
      expect(screen.getByText('Index')).toBeInTheDocument()
      expect(screen.getByText('React Hooks')).toBeInTheDocument()
      expect(screen.getByText('react')).toBeInTheDocument()
      expect(screen.getByText('A guide to React hooks.')).toBeInTheDocument()
      expect(screen.getByText(/other-card/)).toBeInTheDocument()
    })

    it('shows Indexing… while loading', () => {
      render(<CardBack back="" editing={false} location="library" indexLoading={true} />)
      expect(screen.getByText('Indexing…')).toBeInTheDocument()
    })

    it('shows placeholder when library card has no index entry', () => {
      render(<CardBack back="" editing={false} location="library" />)
      expect(screen.getByText('No index entry yet')).toBeInTheDocument()
    })

    it('does not show wiki section for non-library cards', () => {
      render(<CardBack back="" editing={false} location="shelf" indexEntry={entry} cardId="x" />)
      expect(screen.queryByText('Index')).not.toBeInTheDocument()
    })

    it('shows inline debug panel with location and index state', () => {
      render(<CardBack back="" editing={false} location="library" cardId="abc-123" />)
      expect(screen.getByText('Index debug')).toBeInTheDocument()
      expect(screen.getByText('index in state')).toBeInTheDocument()
      expect(screen.getByText('No index entry yet')).toBeInTheDocument()
    })
  })
})
