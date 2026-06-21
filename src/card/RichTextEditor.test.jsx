import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EmbedEntriesProvider } from './EmbedEntriesContext'
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

  it('renders the embedded card view with title and body for a known [[cardId]]', async () => {
    const entries = [{ id: 'card-1', title: 'My Note', body: 'Hello world' }]
    render(
      <RichTextEditorProvider>
        <EmbedEntriesProvider entries={entries}>
          <RichTextEditor value="[[card-1]]" editable={false} />
        </EmbedEntriesProvider>
      </RichTextEditorProvider>
    )
    await waitFor(() => expect(document.querySelector('.embedded-card-view')).toBeInTheDocument())
    expect(screen.getByText('My Note')).toBeInTheDocument()
  })

  it('renders the missing fallback for an unknown [[cardId]]', async () => {
    render(
      <RichTextEditorProvider>
        <EmbedEntriesProvider entries={[]}>
          <RichTextEditor value="[[unknown-card]]" editable={false} />
        </EmbedEntriesProvider>
      </RichTextEditorProvider>
    )
    await waitFor(() => expect(document.querySelector('.embedded-card-view__missing')).toBeInTheDocument())
  })
})
