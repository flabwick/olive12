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

  it('shows Vault actions toolbar when selectedVaultItem is set', () => {
    const card = { id: 'c1', title: 'Notes', body: '', location: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: card, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('toolbar', { name: 'Vault actions' })).toBeInTheDocument()
  })
})

describe('Dock — vault selection state', () => {
  const shelfCard = { id: 'c1', title: 'Meeting notes', body: '', location: 'shelf' }

  it('renders selection actions when selectedVaultItem is set and vault is open', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('toolbar', { name: 'Vault actions' })).toBeInTheDocument()
  })

  it('shows Open button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('calls onVaultAddToDock when Open is clicked', async () => {
    const onVaultAddToDock = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultAddToDock={onVaultAddToDock}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(onVaultAddToDock).toHaveBeenCalledWith('c1')
  })

  it('calls onClearVaultItem when Back is clicked', async () => {
    const onClearVaultItem = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={onClearVaultItem}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onClearVaultItem).toHaveBeenCalledOnce()
  })

  it('calls onVaultStartInlineRename and clears selection when Rename is clicked', async () => {
    const onVaultStartInlineRename = vi.fn()
    const onClearVaultItem = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultStartInlineRename={onVaultStartInlineRename}
        onClearVaultItem={onClearVaultItem}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Rename' }))
    expect(onVaultStartInlineRename).toHaveBeenCalledWith(shelfCard.id, 'card')
    expect(onClearVaultItem).toHaveBeenCalledOnce()
  })

  it('shows Switch to tab and Delete for saved tabs', () => {
    const tab = { id: 't1', name: 'Research', savedLocation: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: tab, type: 'tab' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Switch to tab' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows confirm delete button after Delete click for a tab', async () => {
    const tab = { id: 't1', name: 'Research', savedLocation: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: tab, type: 'tab' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
  })

  it('shows Move button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
  })

  it('shows Move button for a tab', () => {
    const tab = { id: 't1', name: 'Research', savedLocation: 'shelf' }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: tab, type: 'tab' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
  })

  it('shows Move button for a folder', () => {
    const folder = { id: 'f1', name: 'Work', parentId: null }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: folder, type: 'folder' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move' })).toBeInTheDocument()
  })

  it('shows Delete card button for a card', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('shows Confirm delete button after Delete is clicked for a card', async () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('button', { name: 'Confirm delete' })).toBeInTheDocument()
  })

  it('calls onVaultDeleteCard and onClearVaultItem when Confirm delete is clicked', async () => {
    const onVaultDeleteCard = vi.fn()
    const onClearVaultItem = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onVaultDeleteCard={onVaultDeleteCard}
        onClearVaultItem={onClearVaultItem}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm delete' }))
    expect(onVaultDeleteCard).toHaveBeenCalledWith('c1')
    expect(onClearVaultItem).toHaveBeenCalledOnce()
  })

  it('shows Delete button for a folder', () => {
    const folder = { id: 'f1', name: 'Work', parentId: null }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: folder, type: 'folder' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('calls onVaultDeleteFolderRequest immediately when Delete is clicked for a folder', async () => {
    const onVaultDeleteFolderRequest = vi.fn()
    const folder = { id: 'f1', name: 'Work', parentId: null }
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: folder, type: 'folder' }}
        onClearVaultItem={vi.fn()}
        onVaultDeleteFolderRequest={onVaultDeleteFolderRequest}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onVaultDeleteFolderRequest).toHaveBeenCalledWith('f1')
  })

  it('calls onVaultPickFolder when Move button is clicked', async () => {
    const onVaultPickFolder = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
        onVaultPickFolder={onVaultPickFolder}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Move' }))
    expect(onVaultPickFolder).toHaveBeenCalledOnce()
  })

  it('does not render vault bar when selectedVaultItem is null and vault is closed', () => {
    wrap(<Dock dockState={DOCK_STATE.BASE} selectedVaultItem={null} />)
    expect(screen.queryByRole('toolbar', { name: 'Vault actions' })).not.toBeInTheDocument()
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
    expect(screen.queryByRole('toolbar', { name: 'Vault actions' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
  })
})

describe('Dock — folder pick mode', () => {
  const shelfCard = { id: 'c1', title: 'Meeting notes', body: '', location: 'shelf' }

  it('shows Move here button in folder pick mode', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        vaultTab="library"
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Move here' })).toBeInTheDocument()
  })

  it('shows Library as destination when on library tab with no move target', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        vaultTab="library"
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByText(/→ Library/)).toBeInTheDocument()
  })

  it('shows Shelf as destination when on shelf tab', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        vaultTab="shelf"
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByText(/→ Shelf/)).toBeInTheDocument()
  })

  it('shows folder name as destination when moveTarget is set', () => {
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        vaultTab="library"
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        moveTarget={{ id: 'f1', name: 'Work' }}
        onClearVaultItem={vi.fn()}
      />,
    )
    expect(screen.getByText(/→ Work/)).toBeInTheDocument()
  })

  it('calls onConfirmMove when Move here is clicked', async () => {
    const onConfirmMove = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        vaultTab="library"
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
        onConfirmMove={onConfirmMove}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Move here' }))
    expect(onConfirmMove).toHaveBeenCalledOnce()
  })

  it('calls onVaultPickFolderCancel when Back is clicked in folder pick mode', async () => {
    const onVaultPickFolderCancel = vi.fn()
    wrap(
      <Dock
        dockState={DOCK_STATE.BASE}
        vaultOpen
        vaultTab="library"
        pickingFolder
        selectedVaultItem={{ item: shelfCard, type: 'card' }}
        onClearVaultItem={vi.fn()}
        onVaultPickFolderCancel={onVaultPickFolderCancel}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
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
