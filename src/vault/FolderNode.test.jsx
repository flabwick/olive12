import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FolderNode } from './FolderNode'

const folder = { id: 'f1', name: 'Work', parentId: null }

describe('FolderNode', () => {
  it('renders folder name', () => {
    render(<FolderNode folder={folder} onToggle={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByText('Work')).toBeInTheDocument()
  })

  it('renders expand button with aria-expanded false when closed', () => {
    render(<FolderNode folder={folder} isOpen={false} onToggle={vi.fn()} onClick={vi.fn()} />)
    const btn = screen.getByRole('button', { name: 'Expand folder' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders collapse button with aria-expanded true when open', () => {
    render(<FolderNode folder={folder} isOpen onToggle={vi.fn()} onClick={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Collapse folder' })).toBeInTheDocument()
  })

  it('calls onToggle when chevron is clicked', async () => {
    const onToggle = vi.fn()
    render(<FolderNode folder={folder} onToggle={onToggle} onClick={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Expand folder' }))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('calls onClick with folder object when folder row is clicked', async () => {
    const onClick = vi.fn()
    render(<FolderNode folder={folder} onToggle={vi.fn()} onClick={onClick} />)
    await userEvent.click(screen.getByText('Work'))
    expect(onClick).toHaveBeenCalledWith(folder)
  })

  it('does not render a ··· menu button', () => {
    render(<FolderNode folder={folder} onToggle={vi.fn()} onClick={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Folder menu' })).not.toBeInTheDocument()
  })

  it('renders children when isOpen is true', () => {
    render(
      <FolderNode folder={folder} isOpen onToggle={vi.fn()} onClick={vi.fn()}>
        <span>Child content</span>
      </FolderNode>,
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('does not render children when isOpen is false', () => {
    render(
      <FolderNode folder={folder} isOpen={false} onToggle={vi.fn()} onClick={vi.fn()}>
        <span>Child content</span>
      </FolderNode>,
    )
    expect(screen.queryByText('Child content')).not.toBeInTheDocument()
  })
})
