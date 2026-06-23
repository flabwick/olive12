import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VaultContextMenu } from './VaultContextMenu'

const POSITION = { x: 100, y: 100 }

describe('VaultContextMenu', () => {
  it('renders action items as buttons', () => {
    const items = [{ type: 'action', label: 'Rename', onClick: vi.fn() }]
    render(<VaultContextMenu items={items} position={POSITION} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Rename' })).toBeInTheDocument()
  })

  it('calls onClick and onClose when an action item is clicked', async () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    const items = [{ type: 'action', label: 'Delete', onClick }]
    render(<VaultContextMenu items={items} position={POSITION} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows confirm button after clicking a confirm-type item', async () => {
    const items = [
      { type: 'confirm', label: 'Delete', confirmLabel: 'Yes, delete', onClick: vi.fn() },
    ]
    render(<VaultContextMenu items={items} position={POSITION} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByRole('button', { name: 'Yes, delete' })).toBeInTheDocument()
  })

  it('calls onClick and onClose when confirm button is clicked', async () => {
    const onClick = vi.fn()
    const onClose = vi.fn()
    const items = [{ type: 'confirm', label: 'Delete', confirmLabel: 'Yes', onClick }]
    render(<VaultContextMenu items={items} position={POSITION} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(onClick).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows two choices after clicking a confirm-two item', async () => {
    const items = [
      {
        type: 'confirm-two',
        label: 'Delete folder',
        choices: [
          { label: 'Reassign contents', onClick: vi.fn() },
          { label: 'Delete contents', onClick: vi.fn() },
        ],
      },
    ]
    render(<VaultContextMenu items={items} position={POSITION} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Delete folder' }))
    expect(screen.getByRole('button', { name: 'Reassign contents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete contents' })).toBeInTheDocument()
  })

  it('renders dividers', () => {
    const items = [
      { type: 'action', label: 'Rename', onClick: vi.fn() },
      { type: 'divider' },
      { type: 'action', label: 'Delete', onClick: vi.fn() },
    ]
    render(<VaultContextMenu items={items} position={POSITION} onClose={vi.fn()} />)
    expect(document.querySelectorAll('.vault-context-menu__divider')).toHaveLength(1)
  })

  it('calls onClose when Escape is pressed', async () => {
    const onClose = vi.fn()
    const items = [{ type: 'action', label: 'A', onClick: vi.fn() }]
    render(<VaultContextMenu items={items} position={POSITION} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders inside document.body via portal', () => {
    const items = [{ type: 'action', label: 'X', onClick: vi.fn() }]
    const { container } = render(
      <VaultContextMenu items={items} position={POSITION} onClose={vi.fn()} />,
    )
    expect(container.querySelector('.vault-context-menu')).toBeNull()
    expect(document.body.querySelector('.vault-context-menu')).toBeTruthy()
  })
})
