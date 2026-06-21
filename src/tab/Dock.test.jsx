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
  it('renders formatting toolbar buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Bold (⌘B)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Italic (⌘I)' })).toBeInTheDocument()
  })

  it('calls onMoveDockCardToTab when "Move card to tab" button is clicked', async () => {
    const onMoveDockCardToTab = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.DOCK_EDITOR} onMoveDockCardToTab={onMoveDockCardToTab} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move card to tab' }))
    expect(onMoveDockCardToTab).toHaveBeenCalledOnce()
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
})

describe('Dock — TAB_EDITOR state', () => {
  it('renders formatting toolbar buttons', () => {
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} />)
    expect(screen.getByRole('button', { name: 'Bold (⌘B)' })).toBeInTheDocument()
  })

  it('calls onMoveToDock when "Pin to dock" button is clicked', async () => {
    const onMoveToDock = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} onMoveToDock={onMoveToDock} />)
    await userEvent.click(screen.getByRole('button', { name: 'Pin to dock' }))
    expect(onMoveToDock).toHaveBeenCalledOnce()
  })

  it('does not render Move card to tab button', () => {
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} />)
    expect(screen.queryByRole('button', { name: 'Move card to tab' })).not.toBeInTheDocument()
  })

  it('calls onSettings when settings button is clicked', async () => {
    const onSettings = vi.fn()
    wrap(<Dock dockState={DOCK_STATE.TAB_EDITOR} onSettings={onSettings} />)
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(onSettings).toHaveBeenCalledOnce()
  })
})
