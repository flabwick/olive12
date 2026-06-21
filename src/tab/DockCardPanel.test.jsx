import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditorProvider } from '../card/RichTextEditorContext'
import { DockCardPanel } from './DockCardPanel'

const SAMPLE_CARD = {
  id: 'c1',
  title: 'My dock card',
  body: '',
  back: '',
  location: 'none',
}

function wrap(ui) {
  return render(<RichTextEditorProvider>{ui}</RichTextEditorProvider>)
}

describe('DockCardPanel', () => {
  it('renders null when card is not provided', () => {
    const { container } = wrap(<DockCardPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the card heading when a card is provided', () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('heading', { name: 'My dock card' })).toBeInTheDocument()
  })

  it('renders the complementary landmark with correct label', () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('complementary', { name: 'Dock card' })).toBeInTheDocument()
  })

  it('calls onClose when the card header close button is clicked', async () => {
    const onClose = vi.fn()
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={onClose} onUpdate={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders a fold toggle button in the card header', () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('button', { name: 'Collapse card' })).toBeInTheDocument()
  })

  it('fold toggle collapses and expands the card body', async () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    const toggle = screen.getByRole('button', { name: 'Collapse card' })
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Expand card' })).toBeInTheDocument()
    expect(document.querySelector('.card__body-rte-wrapper')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Expand card' }))
    expect(document.querySelector('.card__body-rte-wrapper')).toBeInTheDocument()
  })

  it('renders a flip button in the card header', () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    expect(screen.getByRole('button', { name: 'Show card back' })).toBeInTheDocument()
  })

  it('flip button toggles the card to its back face', async () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Show card back' }))
    expect(screen.getByRole('button', { name: 'Show card front' })).toBeInTheDocument()
  })

  it('renders with editorSurface dock (Card body wrapper present)', () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    expect(document.querySelector('.card__body-rte-wrapper')).toBeInTheDocument()
  })
})
