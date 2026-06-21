import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditorProvider } from './RichTextEditorContext'
import { RichTextEditor } from './RichTextEditor'

function wrap(ui) {
  return render(<RichTextEditorProvider>{ui}</RichTextEditorProvider>)
}

describe('RichTextEditor', () => {
  it('renders without crashing', () => {
    wrap(<RichTextEditor value="Hello" />)
    expect(document.querySelector('.rich-text-editor')).toBeInTheDocument()
  })

  it('renders the body text from markdown value', () => {
    wrap(<RichTextEditor value="Hello world" />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders bold markdown as strong element', () => {
    wrap(<RichTextEditor value="**bold**" />)
    expect(document.querySelector('strong')).toBeInTheDocument()
  })

  it('applies the aria-label to the editor when ariaLabel is provided', () => {
    wrap(<RichTextEditor value="" ariaLabel="Card body" />)
    expect(screen.getByRole('textbox', { name: 'Card body' })).toBeInTheDocument()
  })

  it('accepts onChange prop without throwing', () => {
    const onChange = vi.fn()
    expect(() => wrap(<RichTextEditor value="initial" onChange={onChange} editable={true} />)).not.toThrow()
  })

  it('renders an embedded-card-node element for [[cardId]] in the markdown value', () => {
    wrap(<RichTextEditor value="[[card-1]]" editable={false} />)
    const node = document.querySelector('.embedded-card-node')
    expect(node).toBeInTheDocument()
    expect(node.textContent).toContain('card-1')
  })
})
