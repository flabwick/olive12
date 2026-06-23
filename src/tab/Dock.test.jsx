import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RichTextEditorProvider } from '../card/RichTextEditorContext'
import { DOCK_STATE } from './dockStateMachine'
import { Dock } from './Dock'

const SAMPLE_ENTRIES = [
  { cardId: 'c1', card: { id: 'c1', title: 'First card', body: '' } },
  { cardId: 'c2', card: { id: 'c2', title: '', body: '' } },
]

function wrap(ui) {
  return render(<RichTextEditorProvider>{ui}</RichTextEditorProvider>)
}

describe('Dock — BASE state', () => {
  it('renders a pill for each dockCardEntry', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} dockCardEntries={SAMPLE_ENTRIES} />)
    expect(screen.getByText('First card')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('calls onAddDockCard when + button is clicked', async () => {
    const onAddDockCard = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} onAddDockCard={onAddDockCard} />)
    await userEvent.click(screen.getByRole('button', { name: 'Pin new card' }))
    expect(onAddDockCard).toHaveBeenCalledOnce()
  })

  it('calls onFolderOpen when library button is clicked', async () => {
    const onFolderOpen = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} onFolderOpen={onFolderOpen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Library' }))
    expect(onFolderOpen).toHaveBeenCalledOnce()
  })

  it('calls onSettings when settings button is clicked', async () => {
    const onSettings = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} onSettings={onSettings} />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onSettings).toHaveBeenCalledOnce()
  })

  it('active pill has active class', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        dockCardEntries={SAMPLE_ENTRIES}
        activeDockCardId="c1"
      />
    )
    const activePill = screen.getByText('First card').closest('button')
    expect(activePill).toHaveClass('dock__pill--active')
    const inactivePill = screen.getByText('2').closest('button')
    expect(inactivePill).not.toHaveClass('dock__pill--active')
  })

  it('calls onOpenDockCard with cardId when a pill is clicked', async () => {
    const onOpenDockCard = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        dockCardEntries={SAMPLE_ENTRIES}
        onOpenDockCard={onOpenDockCard}
      />
    )
    await userEvent.click(screen.getByText('First card'))
    expect(onOpenDockCard).toHaveBeenCalledWith('c1')
  })

  it('does not render any formatting toolbar buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} dockCardEntries={SAMPLE_ENTRIES} />)
    expect(screen.queryByRole('button', { name: /Bold/i })).not.toBeInTheDocument()
  })
})

describe('Dock — DOCK_EDITOR state', () => {
  it('renders Exit editor button', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Exit editor' })).toBeInTheDocument()
  })

  it('renders Bold and Italic toolbar buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Italic' })).toBeInTheDocument()
  })

  it('renders all new toolbar buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Highlight' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Code block' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bullet list' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ordered list' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Outdent' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Checkbox list' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Strikethrough' })).toBeInTheDocument()
  })

  it('renders expandable Heading button', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Heading' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Heading 1' })).not.toBeInTheDocument()
  })

  it('expands heading options on Heading button click', async () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    await userEvent.click(screen.getByRole('button', { name: 'Heading' }))
    expect(screen.getByRole('button', { name: 'Heading 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heading 2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Heading 3' })).toBeInTheDocument()
  })

  it('does not render Move card to tab button', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Move card to tab' })).not.toBeInTheDocument()
  })

  it('does not render Settings button in formatting toolbar', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('calls onLightningToggle when lightning button is clicked', async () => {
    const onLightningToggle = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} onLightningToggle={onLightningToggle} />)
    await userEvent.click(screen.getByRole('button', { name: 'AI prompt' }))
    expect(onLightningToggle).toHaveBeenCalledOnce()
  })

  it('aria-pressed on lightning button reflects lightningActive', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} lightningActive={true} />)
    expect(screen.getByRole('button', { name: 'AI prompt' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not render Pin to dock button', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Pin to dock' })).not.toBeInTheDocument()
  })

  it('does not render Collapse dock panel button', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Collapse dock panel' })).not.toBeInTheDocument()
  })

  it('does not render dock card pills in DOCK_EDITOR state', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.DOCK_EDITOR}
        dockCardEntries={SAMPLE_ENTRIES}
        activeDockCardId="c1"
      />
    )
    expect(screen.queryByRole('button', { name: 'First card' })).not.toBeInTheDocument()
  })
})

describe('Dock — vault browse state', () => {
  it('renders vault browse toolbar when vaultOpen is true and no item is selected', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen />)
    expect(screen.getByRole('toolbar', { name: 'Vault actions' })).toBeInTheDocument()
  })

  it('shows New card button', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen />)
    expect(screen.getByRole('button', { name: 'New card' })).toBeInTheDocument()
  })

  it('shows Shelf, Library and Brain tab buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen vaultTab="shelf" />)
    expect(screen.getByRole('button', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brain' })).toBeInTheDocument()
  })

  it('marks the active tab button as active', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen vaultTab="library" />)
    expect(screen.getByRole('button', { name: 'Library' })).toHaveClass('dock__vault-tab--active')
    expect(screen.getByRole('button', { name: 'Shelf' })).not.toHaveClass('dock__vault-tab--active')
  })

  it('calls onVaultTabChange when a tab button is clicked', async () => {
    const onVaultTabChange = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen vaultTab="shelf" onVaultTabChange={onVaultTabChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Library' }))
    expect(onVaultTabChange).toHaveBeenCalledWith('library')
  })

  it('calls onVaultNewCard when New card is clicked', async () => {
    const onVaultNewCard = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen onVaultNewCard={onVaultNewCard} />)
    await userEvent.click(screen.getByRole('button', { name: 'New card' }))
    expect(onVaultNewCard).toHaveBeenCalledOnce()
  })

  it('does not show New folder button on shelf tab', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen vaultTab="shelf" />)
    expect(screen.queryByRole('button', { name: 'New folder' })).not.toBeInTheDocument()
  })

  it('shows New folder button on library tab', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen vaultTab="library" />)
    expect(screen.getByRole('button', { name: 'New folder' })).toBeInTheDocument()
  })

  it('calls onVaultNewFolder when New folder is clicked in library tab', async () => {
    const onVaultNewFolder = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen vaultTab="library" onVaultNewFolder={onVaultNewFolder} />)
    await userEvent.click(screen.getByRole('button', { name: 'New folder' }))
    expect(onVaultNewFolder).toHaveBeenCalledOnce()
  })

  it('calls onFolderOpen when Close vault is clicked', async () => {
    const onFolderOpen = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen onFolderOpen={onFolderOpen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close vault' }))
    expect(onFolderOpen).toHaveBeenCalledOnce()
  })

  it('does not render vault browse bar when vault is closed', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} vaultOpen={false} />)
    expect(screen.queryByRole('toolbar', { name: 'Vault actions' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pin new card' })).toBeInTheDocument()
  })

  it('shows vault selection bar instead of browse bar when selectedVaultItem is set', () => {
    const card = { id: 'c1', title: 'Notes', body: '', location: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: card, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.queryByRole('toolbar', { name: 'Vault actions' })).not.toBeInTheDocument()
    expect(screen.getByRole('toolbar', { name: 'Vault item actions' })).toBeInTheDocument()
  })
})

describe('Dock — vault selection state', () => {
  const shelfCard = { id: 'c1', title: 'Meeting notes', body: '', location: 'shelf' }

  it('renders VaultSelectionBar when selectedVaultItem is set in BASE state', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('toolbar', { name: 'Vault item actions' })).toBeInTheDocument()
    expect(screen.getByText('Meeting notes')).toBeInTheDocument()
  })

  it('shows Add to tab button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Add to tab' })).toBeInTheDocument()
  })

  it('shows Open in dock button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Open in dock' })).toBeInTheDocument()
  })

  it('calls onVaultAddToDock when Open in dock is clicked', async () => {
    const onVaultAddToDock = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultAddToDock={onVaultAddToDock}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open in dock' }))
    expect(onVaultAddToDock).toHaveBeenCalledWith('c1')
  })

  it('shows Move to library for a shelf card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move to library' })).toBeInTheDocument()
  })

  it('shows Move to shelf for a library card', () => {
    const libraryCard = { id: 'c2', title: 'Doc', body: '', location: 'library' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: libraryCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move to shelf' })).toBeInTheDocument()
  })

  it('calls onVaultAddToTab and onClearVaultItem when Add to tab is clicked', async () => {
    const onVaultAddToTab = vi.fn()
    const onClearVaultItem = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultAddToTab={onVaultAddToTab}
        onClearVaultItem={onClearVaultItem}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Add to tab' }))
    expect(onVaultAddToTab).toHaveBeenCalledWith('c1')
    expect(onClearVaultItem).toHaveBeenCalledOnce()
  })

  it('calls onClearVaultItem when back button is clicked', async () => {
    const onClearVaultItem = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={onClearVaultItem}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Back to vault' }))
    expect(onClearVaultItem).toHaveBeenCalledOnce()
  })

  it('switches to rename mode when Rename card is clicked', async () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Rename card' }))
    expect(screen.getByRole('textbox', { name: 'New name' })).toBeInTheDocument()
  })

  it('calls onVaultRenameCard when rename is committed with Enter', async () => {
    const onVaultRenameCard = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultRenameCard={onVaultRenameCard}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Rename card' }))
    const input = screen.getByRole('textbox', { name: 'New name' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated title{Enter}')
    expect(onVaultRenameCard).toHaveBeenCalledWith('c1', 'Updated title')
  })

  it('shows Switch to tab and Remove tab for saved tabs', () => {
    const tab = { id: 't1', name: 'Research', savedLocation: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: tab, type: 'tab' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Switch to tab' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove tab' })).toBeInTheDocument()
  })

  it('shows confirm button after Remove tab click', async () => {
    const tab = { id: 't1', name: 'Research', savedLocation: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: tab, type: 'tab' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remove tab' }))
    expect(screen.getByRole('button', { name: 'Confirm remove tab' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('shows Move to folder button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move to folder' })).toBeInTheDocument()
  })

  it('shows Move to folder button for a tab', () => {
    const tab = { id: 't1', name: 'Research', savedLocation: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: tab, type: 'tab' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move to folder' })).toBeInTheDocument()
  })

  it('does not show Move to folder button for a folder', () => {
    const folder = { id: 'f1', name: 'Work', parentId: null }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: folder, type: 'folder' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Move to folder' })).not.toBeInTheDocument()
  })

  it('shows Delete card button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete card' })).toBeInTheDocument()
  })

  it('shows confirm-delete-card toolbar after Delete card is clicked', async () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
    expect(screen.getByRole('toolbar', { name: 'Confirm delete card' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Confirm delete card' })).toBeInTheDocument()
  })

  it('calls onVaultDeleteCard and onClearVaultItem when confirm delete card is clicked', async () => {
    const onVaultDeleteCard = vi.fn()
    const onClearVaultItem = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultDeleteCard={onVaultDeleteCard}
        onClearVaultItem={onClearVaultItem}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete card' }))
    expect(onVaultDeleteCard).toHaveBeenCalledWith('c1')
    expect(onClearVaultItem).toHaveBeenCalledOnce()
  })

  it('returns to normal mode when Cancel is clicked in confirm-delete-card', async () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('toolbar', { name: 'Vault item actions' })).toBeInTheDocument()
  })

  it('shows Delete folder button for a folder', () => {
    const folder = { id: 'f1', name: 'Work', parentId: null }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: folder, type: 'folder' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete folder' })).toBeInTheDocument()
  })

  it('calls onVaultDeleteFolderRequest immediately when Delete folder is clicked', async () => {
    const onVaultDeleteFolderRequest = vi.fn()
    const folder = { id: 'f1', name: 'Work', parentId: null }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: folder, type: 'folder' }}
        onClearVaultItem={vi.fn()}
        onVaultDeleteFolderRequest={onVaultDeleteFolderRequest}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete folder' }))
    expect(onVaultDeleteFolderRequest).toHaveBeenCalledWith('f1')
  })

  it('calls onVaultPickFolder when Move to folder button is clicked', async () => {
    const onVaultPickFolder = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
        onVaultPickFolder={onVaultPickFolder}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Move to folder' }))
    expect(onVaultPickFolder).toHaveBeenCalledOnce()
  })

  it('does not render vault bar when selectedVaultItem is null', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} selectedVaultItem={null} />)
    expect(screen.queryByRole('toolbar', { name: 'Vault item actions' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pin new card' })).toBeInTheDocument()
  })

  it('does not render vault bar in DOCK_EDITOR state even if selectedVaultItem is set', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.DOCK_EDITOR}
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.queryByRole('toolbar', { name: 'Vault item actions' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })
})

describe('Dock — folder pick mode', () => {
  const shelfCard = { id: 'c1', title: 'Meeting notes', body: '', location: 'shelf' }

  it('shows folder pick bar when pickingFolder is true with a selected item', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('toolbar', { name: 'Move to folder' })).toBeInTheDocument()
    expect(screen.queryByRole('toolbar', { name: 'Vault item actions' })).not.toBeInTheDocument()
  })

  it('shows the selected item name in folder pick bar', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByText('Meeting notes')).toBeInTheDocument()
  })

  it('shows Move to root button in folder pick bar', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move to root' })).toBeInTheDocument()
  })

  it('calls onVaultMoveToFolder with null when Move to root is clicked', async () => {
    const onVaultMoveToFolder = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
        onVaultMoveToFolder={onVaultMoveToFolder}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Move to root' }))
    expect(onVaultMoveToFolder).toHaveBeenCalledWith(null)
  })

  it('calls onVaultPickFolderCancel when Cancel move is clicked', async () => {
    const onVaultPickFolderCancel = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
        onVaultPickFolderCancel={onVaultPickFolderCancel}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel move' }))
    expect(onVaultPickFolderCancel).toHaveBeenCalledOnce()
  })
})

describe('Dock — TAB_EDITOR state', () => {
  it('renders formatting toolbar buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })

  it('does not render Pin to dock button', () => {
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Pin to dock' })).not.toBeInTheDocument()
  })

  it('does not render Move card to tab button', () => {
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Move card to tab' })).not.toBeInTheDocument()
  })

  it('does not render Settings button', () => {
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()
  })
})
