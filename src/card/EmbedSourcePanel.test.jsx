import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmbedSourcePanel } from './EmbedSourcePanel'

const SAMPLE_ENTRIES = [
  { id: 'c1', title: 'Meeting notes', body: '' },
  { id: 'c2', title: 'Project plan', body: '' },
  { id: 'c3', title: '', body: '' },
]

describe('EmbedSourcePanel', () => {
  it('renders the search input', () => {
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByLabelText('Search cards to embed')).toBeInTheDocument()
  })

  it('renders a button for each entry', () => {
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Project plan' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '(untitled)' })).toBeInTheDocument()
  })

  it('shows "No cards found." when no entries match the filter', async () => {
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Search cards to embed'), 'zzz')
    expect(screen.getByText('No cards found.')).toBeInTheDocument()
  })

  it('filters entries by title when a search term is typed', async () => {
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText('Search cards to embed'), 'meeting')
    expect(screen.getByRole('button', { name: 'Meeting notes' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Project plan' })).not.toBeInTheDocument()
  })

  it('calls onSelect with cardId when a card button is clicked', async () => {
    const onSelect = vi.fn()
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={onSelect} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Project plan' }))
    expect(onSelect).toHaveBeenCalledWith('c2')
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel embed' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders the dialog with correct aria-label', () => {
    render(<EmbedSourcePanel entries={[]} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Insert embed' })).toBeInTheDocument()
  })

  it('shows empty state when entries is empty', () => {
    render(<EmbedSourcePanel entries={[]} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('No cards found.')).toBeInTheDocument()
  })

  it('does not show the new card button when onCreateNew is not provided', () => {
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Create new embedded card' })).not.toBeInTheDocument()
  })

  it('shows the new card button when onCreateNew is provided', () => {
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} onCreateNew={() => {}} />)
    expect(screen.getByRole('button', { name: 'Create new embedded card' })).toBeInTheDocument()
  })

  it('calls onCreateNew when the new card button is clicked', async () => {
    const onCreateNew = vi.fn()
    render(<EmbedSourcePanel entries={SAMPLE_ENTRIES} onSelect={() => {}} onClose={() => {}} onCreateNew={onCreateNew} />)
    await userEvent.click(screen.getByRole('button', { name: 'Create new embedded card' }))
    expect(onCreateNew).toHaveBeenCalledOnce()
  })
})
