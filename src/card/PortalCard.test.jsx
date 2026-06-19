import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PortalCard } from './PortalCard'

const cardsById = {
  'target-1': { id: 'target-1', title: 'Target Title', body: 'Target body text', type: 'text', config: null },
}

const resolvedConfig = { target_card_id: 'target-1' }
const unresolvedConfig = { target_card_id: null }

describe('PortalCard', () => {
  it('renders target title and body when resolved', () => {
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Target Title' })).toBeInTheDocument()
    expect(screen.getByText('Target body text')).toBeInTheDocument()
  })

  it('renders placeholder title when target is null', () => {
    render(<PortalCard config={unresolvedConfig} cardsById={cardsById} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Portal — no target' })).toBeInTheDocument()
  })

  it('renders placeholder body when target is null', () => {
    render(<PortalCard config={unresolvedConfig} cardsById={cardsById} />)
    expect(screen.getByText('No card linked.')).toBeInTheDocument()
  })

  it('renders placeholder when cardsById does not contain the target', () => {
    render(<PortalCard config={resolvedConfig} cardsById={{}} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Portal — no target' })).toBeInTheDocument()
  })

  it('hides body when foldState is true', () => {
    render(
      <PortalCard config={resolvedConfig} cardsById={cardsById} foldState={true} onToggleFold={() => {}} />,
    )
    expect(screen.queryByText('Target body text')).not.toBeInTheDocument()
  })

  it('shows body when foldState is false', () => {
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} foldState={false} />)
    expect(screen.getByText('Target body text')).toBeInTheDocument()
  })

  it('applies card--hidden class when hiddenState is true', () => {
    render(
      <PortalCard config={resolvedConfig} cardsById={cardsById} hiddenState={true} onToggleHide={() => {}} />,
    )
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading.closest('.card')).toHaveClass('card--hidden')
  })

  it('calls onClose when Remove card button is clicked', async () => {
    const onClose = vi.fn()
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onMoveUp when Move card up button is clicked', async () => {
    const onMoveUp = vi.fn()
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} onMoveUp={onMoveUp} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card up' }))
    expect(onMoveUp).toHaveBeenCalledOnce()
  })

  it('calls onMoveDown when Move card down button is clicked', async () => {
    const onMoveDown = vi.fn()
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} onMoveDown={onMoveDown} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card down' }))
    expect(onMoveDown).toHaveBeenCalledOnce()
  })

  it('calls onUpdate with edited fields when content is committed', async () => {
    const onUpdate = vi.fn()
    render(
      <div>
        <PortalCard config={resolvedConfig} cardsById={cardsById} onUpdate={onUpdate} />
        <button type="button">Outside</button>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Target body text' }))
    const textarea = screen.getByRole('textbox', { name: 'Card body' })
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'Edited content')
    await userEvent.click(screen.getByRole('button', { name: 'Outside' }))
    expect(onUpdate).toHaveBeenCalledWith({ title: 'Target Title', body: 'Edited content' })
  })

  it('does not allow editing when target is null', () => {
    render(<PortalCard config={unresolvedConfig} cardsById={cardsById} onUpdate={() => {}} />)
    expect(screen.queryByRole('button', { name: 'No card linked.' })).not.toBeInTheDocument()
  })

  it('renders Show in vault button when onLocate is provided and target exists', () => {
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} onLocate={() => {}} />)
    expect(screen.getByRole('button', { name: 'Show in vault' })).toBeInTheDocument()
  })

  it('does not render Show in vault button when onLocate is absent', () => {
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} />)
    expect(screen.queryByRole('button', { name: 'Show in vault' })).not.toBeInTheDocument()
  })

  it('does not render Show in vault button when target is null', () => {
    render(<PortalCard config={unresolvedConfig} cardsById={cardsById} onLocate={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Show in vault' })).not.toBeInTheDocument()
  })

  it('calls onLocate when Show in vault is clicked', async () => {
    const onLocate = vi.fn()
    render(<PortalCard config={resolvedConfig} cardsById={cardsById} onLocate={onLocate} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show in vault' }))
    expect(onLocate).toHaveBeenCalledOnce()
  })
})
