import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { LibraryView } from './LibraryView'

const folders = [
  { id: 'f1', name: 'Work', parentId: null },
  { id: 'f2', name: 'Projects', parentId: 'f1' },
]

const cards = [
  { id: 'c1', title: 'Report', body: '', folderId: 'f1', location: 'library' },
  { id: 'c2', title: 'Root card', body: '', folderId: null, location: 'library' },
]

const tabs = [
  { id: 't1', name: 'Research', savedFolderId: null, savedLocation: 'library' },
]

describe('LibraryView', () => {
  it('renders folder names', () => {
    render(<LibraryView folders={folders} openFolderIds={new Set()} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('shows empty state when no content', () => {
    render(<LibraryView />)
    expect(screen.getByText('Nothing in your vault yet.')).toBeInTheDocument()
  })

  it('renders root-level cards (no folder)', () => {
    render(<LibraryView cards={cards} folders={[]} />)
    expect(screen.getByText('Root card')).toBeInTheDocument()
  })

  it('renders root-level tabs (no folder)', () => {
    render(<LibraryView tabs={tabs} folders={[]} />)
    expect(screen.getByText('Research')).toBeInTheDocument()
  })

  it('renders cards inside an open folder', () => {
    render(
      <LibraryView
        folders={folders}
        cards={cards}
        openFolderIds={new Set(['f1'])}
        onToggleFolder={vi.fn()}
      />,
    )
    expect(screen.getByText('Report')).toBeInTheDocument()
  })

  it('does not render cards inside a closed folder', () => {
    render(
      <LibraryView
        folders={folders}
        cards={cards}
        openFolderIds={new Set()}
        onToggleFolder={vi.fn()}
      />,
    )
    expect(screen.queryByText('Report')).not.toBeInTheDocument()
  })

  it('calls onToggleFolder when a folder chevron is clicked', async () => {
    const onToggleFolder = vi.fn()
    render(
      <LibraryView
        folders={[{ id: 'f1', name: 'Work', parentId: null }]}
        openFolderIds={new Set()}
        onToggleFolder={onToggleFolder}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Expand folder' }))
    expect(onToggleFolder).toHaveBeenCalledWith('f1')
  })

  it('calls onFolderClick with folder object when folder name is clicked', async () => {
    const onFolderClick = vi.fn()
    render(
      <LibraryView
        folders={[{ id: 'f1', name: 'Work', parentId: null }]}
        openFolderIds={new Set()}
        onFolderClick={onFolderClick}
        onToggleFolder={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByText('Work'))
    expect(onFolderClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'f1', name: 'Work' }))
  })

  it('calls onItemClick with card and type when a card is clicked', async () => {
    const onItemClick = vi.fn()
    render(<LibraryView cards={cards} folders={[]} onItemClick={onItemClick} />)
    await userEvent.click(screen.getByText('Root card'))
    expect(onItemClick).toHaveBeenCalledWith(cards[1], 'card')
  })
})
