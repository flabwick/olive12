import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DeleteFolderModal } from './DeleteFolderModal'

describe('DeleteFolderModal', () => {
  it('renders the folder name', () => {
    render(
      <DeleteFolderModal name="Work" cardCount={3} folderCount={1} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText(/"Work"/)).toBeInTheDocument()
  })

  it('shows item count in detail text', () => {
    render(
      <DeleteFolderModal name="Work" cardCount={3} folderCount={1} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText(/4 items/)).toBeInTheDocument()
  })

  it('shows nested folder count when folderCount > 0', () => {
    render(
      <DeleteFolderModal name="Work" cardCount={2} folderCount={2} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByText(/2 nested folders/)).toBeInTheDocument()
  })

  it('does not mention nested folders when folderCount is 0', () => {
    render(
      <DeleteFolderModal name="Work" cardCount={5} folderCount={0} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.queryByText(/nested folder/)).not.toBeInTheDocument()
  })

  it('calls onConfirm when Delete all is clicked', async () => {
    const onConfirm = vi.fn()
    render(
      <DeleteFolderModal name="Work" cardCount={3} folderCount={0} onConfirm={onConfirm} onCancel={vi.fn()} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Delete all' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <DeleteFolderModal name="Work" cardCount={3} folderCount={0} onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn()
    render(
      <DeleteFolderModal name="Work" cardCount={3} folderCount={0} onConfirm={vi.fn()} onCancel={onCancel} />,
    )
    await userEvent.click(document.querySelector('.delete-folder-modal__backdrop'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('has role dialog on the modal panel', () => {
    render(
      <DeleteFolderModal name="Work" cardCount={0} folderCount={0} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
