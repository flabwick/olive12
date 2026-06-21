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

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={onClose} onUpdate={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close dock panel' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders with editorSurface dock (Card component present and editable)', () => {
    wrap(<DockCardPanel card={SAMPLE_CARD} cardId="c1" onClose={() => {}} onUpdate={() => {}} />)
    // The card body wrapper exists, indicating Card was rendered (editing surface tested in Card.test.jsx)
    expect(document.querySelector('.card__body-rte-wrapper')).toBeInTheDocument()
  })
})
