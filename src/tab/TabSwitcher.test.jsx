import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TabSwitcher } from './TabSwitcher'

const TAB_A = { id: 'tab-a', name: 'Alpha', order: 0, savedLocation: 'none', savedFolderId: null }
const TAB_B = { id: 'tab-b', name: 'Beta', order: 1, savedLocation: 'shelf', savedFolderId: null }
const TAB_C = { id: 'tab-c', name: 'Gamma', order: 2, savedLocation: 'library', savedFolderId: null }

function renderSwitcher(props = {}) {
  const defaults = {
    tabs: [TAB_A, TAB_B],
    activeTabId: 'tab-a',
    tabEntries: { 'tab-a': [1, 2, 3], 'tab-b': [1] },
    onSwitch: vi.fn(),
    onClose: vi.fn(),
    onAdd: vi.fn(),
    onRemoveTab: vi.fn(),
    onSaveTab: vi.fn(),
  }
  return render(<TabSwitcher {...defaults} {...props} />)
}

describe('TabSwitcher', () => {
  it('renders all tab tiles', () => {
    renderSwitcher()
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('active tab tile has active class', () => {
    renderSwitcher({ activeTabId: 'tab-a' })
    const tiles = document.querySelectorAll('.tab-switcher__tile:not(.tab-switcher__tile--add)')
    expect(tiles[0]).toHaveClass('tab-switcher__tile--active')
    expect(tiles[1]).not.toHaveClass('tab-switcher__tile--active')
  })

  it('displays card count per tile', () => {
    renderSwitcher()
    expect(screen.getByText('3 cards')).toBeInTheDocument()
    expect(screen.getByText('1 card')).toBeInTheDocument()
  })

  it('clicking a tile calls onSwitch with correct tabId then calls onClose', () => {
    const onSwitch = vi.fn()
    const onClose = vi.fn()
    renderSwitcher({ onSwitch, onClose })
    fireEvent.click(screen.getByText('Beta'))
    expect(onSwitch).toHaveBeenCalledWith('tab-b')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking × calls onRemoveTab with tabId and does not call onSwitch', () => {
    const onRemoveTab = vi.fn()
    const onSwitch = vi.fn()
    renderSwitcher({ onRemoveTab, onSwitch })
    fireEvent.click(screen.getByRole('button', { name: 'Close Alpha' }))
    expect(onRemoveTab).toHaveBeenCalledWith('tab-a')
    expect(onSwitch).not.toHaveBeenCalled()
  })

  it('save button shown only when savedLocation is none', () => {
    renderSwitcher({ tabs: [TAB_A, TAB_B, TAB_C], tabEntries: {} })
    expect(screen.getByRole('button', { name: 'Save Alpha to Shelf' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save Beta to Shelf' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save Gamma to Shelf' })).not.toBeInTheDocument()
  })

  it('save button calls onSaveTab with tabId', () => {
    const onSaveTab = vi.fn()
    renderSwitcher({ onSaveTab })
    fireEvent.click(screen.getByRole('button', { name: 'Save Alpha to Shelf' }))
    expect(onSaveTab).toHaveBeenCalledWith('tab-a')
  })

  it('clicking + tile calls onAdd and onClose', () => {
    const onAdd = vi.fn()
    const onClose = vi.fn()
    renderSwitcher({ onAdd, onClose })
    fireEvent.click(screen.getByRole('button', { name: 'New tab' }))
    expect(onAdd).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('clicking backdrop calls onClose', () => {
    const onClose = vi.fn()
    renderSwitcher({ onClose })
    fireEvent.click(document.querySelector('.tab-switcher__backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('Escape key calls onClose', () => {
    const onClose = vi.fn()
    renderSwitcher({ onClose })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows saved location badge for shelf tabs', () => {
    renderSwitcher({ tabs: [TAB_B], tabEntries: {} })
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('shows saved location badge for library tabs', () => {
    renderSwitcher({ tabs: [TAB_C], tabEntries: {} })
    expect(screen.getByText('In Library')).toBeInTheDocument()
  })

  it('no badge shown for tabs with savedLocation none', () => {
    renderSwitcher({ tabs: [TAB_A], tabEntries: {} })
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
    expect(screen.queryByText('In Library')).not.toBeInTheDocument()
  })
})
