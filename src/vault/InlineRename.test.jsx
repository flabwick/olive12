import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { InlineRename } from './InlineRename'

describe('InlineRename', () => {
  it('renders an input with the initial value', () => {
    render(<InlineRename value="My folder" onCommit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: 'Rename' })).toHaveValue('My folder')
  })

  it('calls onCommit with trimmed value when Enter is pressed', async () => {
    const onCommit = vi.fn()
    render(<InlineRename value="Old" onCommit={onCommit} onCancel={vi.fn()} />)
    const input = screen.getByRole('textbox', { name: 'Rename' })
    await userEvent.clear(input)
    await userEvent.type(input, 'New name{Enter}')
    expect(onCommit).toHaveBeenCalledWith('New name', false)
  })

  it('calls onCancel when Escape is pressed', async () => {
    const onCancel = vi.fn()
    render(<InlineRename value="Old" onCommit={vi.fn()} onCancel={onCancel} />)
    await userEvent.type(screen.getByRole('textbox', { name: 'Rename' }), '{Escape}')
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCommit on blur with current value', async () => {
    const onCommit = vi.fn()
    render(
      <div>
        <InlineRename value="Title" onCommit={onCommit} onCancel={vi.fn()} />
        <button>Other</button>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Other' }))
    expect(onCommit).toHaveBeenCalledWith('Title', false)
  })

  it('calls onCancel on blur when input is empty', async () => {
    const onCancel = vi.fn()
    render(
      <div>
        <InlineRename value="Title" onCommit={vi.fn()} onCancel={onCancel} />
        <button>Other</button>
      </div>,
    )
    await userEvent.clear(screen.getByRole('textbox', { name: 'Rename' }))
    await userEvent.click(screen.getByRole('button', { name: 'Other' }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
