import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FolderPickerOverlay } from './FolderPickerOverlay'

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
  { id: 'f2', name: 'Archive', parentId: null, createdAt: 2, updatedAt: 2 },
  { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
]

describe('FolderPickerOverlay', () => {
  it('renders a dialog with role and name', () => {
    render(<FolderPickerOverlay folders={[]} onSelect={() => {}} onDismiss={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Move to Vault' })).toBeInTheDocument()
  })

  it('renders a Vault root option', () => {
    render(<FolderPickerOverlay folders={[]} onSelect={() => {}} onDismiss={() => {}} />)
    expect(screen.getByRole('button', { name: 'Vault root' })).toBeInTheDocument()
  })

  it('renders a button for each folder', () => {
    render(<FolderPickerOverlay folders={folders} onSelect={() => {}} onDismiss={() => {}} />)
    expect(screen.getByRole('button', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Projects' })).toBeInTheDocument()
  })

  it('calls onSelect with null when Vault root is clicked', async () => {
    const onSelect = vi.fn()
    render(<FolderPickerOverlay folders={[]} onSelect={onSelect} onDismiss={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Vault root' }))
    expect(onSelect).toHaveBeenCalledWith(null)
  })

  it('calls onSelect with folder id when a folder button is clicked', async () => {
    const onSelect = vi.fn()
    render(<FolderPickerOverlay folders={folders} onSelect={onSelect} onDismiss={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Work' }))
    expect(onSelect).toHaveBeenCalledWith('f1')
  })

  it('calls onDismiss when the Close button is clicked', async () => {
    const onDismiss = vi.fn()
    render(<FolderPickerOverlay folders={[]} onSelect={() => {}} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when the backdrop is clicked', async () => {
    const onDismiss = vi.fn()
    render(<FolderPickerOverlay folders={[]} onSelect={() => {}} onDismiss={onDismiss} />)
    await userEvent.click(screen.getByTestId('folder-picker-backdrop'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('lists nested folders after their parent', () => {
    render(<FolderPickerOverlay folders={folders} onSelect={() => {}} onDismiss={() => {}} />)
    const buttons = screen.getAllByRole('button')
    const names = buttons.map((b) => b.textContent)
    const workIdx = names.indexOf('Work')
    const projectsIdx = names.indexOf('Projects')
    expect(projectsIdx).toBe(workIdx + 1)
  })
})
