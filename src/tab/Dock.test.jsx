import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Dock } from './Dock'

describe('Dock', () => {
  it('renders all toolbar buttons', () => {
    render(<Dock />)
    expect(screen.getByRole('button', { name: 'Scroll to top' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Folders' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Prompt' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tab overview' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument()
  })

  it('calls onAdd when + button is clicked', async () => {
    const onAdd = vi.fn()
    render(<Dock onAdd={onAdd} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onAdd).toHaveBeenCalledOnce()
  })

  it('disables the Add button when addDisabled is true', () => {
    render(<Dock addDisabled={true} />)
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
  })

  it('enables the Add button when addDisabled is false', () => {
    render(<Dock addDisabled={false} />)
    expect(screen.getByRole('button', { name: 'Add card' })).not.toBeDisabled()
  })

  it('does not call onAdd when button is disabled', async () => {
    const onAdd = vi.fn()
    render(<Dock onAdd={onAdd} addDisabled={true} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('calls onScrollTop when caret button is clicked', async () => {
    const onScrollTop = vi.fn()
    render(<Dock onScrollTop={onScrollTop} />)
    await userEvent.click(screen.getByRole('button', { name: 'Scroll to top' }))
    expect(onScrollTop).toHaveBeenCalledOnce()
  })

  it('calls onFolder when folders button is clicked', async () => {
    const onFolder = vi.fn()
    render(<Dock onFolder={onFolder} />)
    await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
    expect(onFolder).toHaveBeenCalledOnce()
  })

  it('calls onTabOverview when tab overview button is clicked', async () => {
    const onTabOverview = vi.fn()
    render(<Dock onTabOverview={onTabOverview} />)
    await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
    expect(onTabOverview).toHaveBeenCalledOnce()
  })

  it('calls onMenu when menu button is clicked', async () => {
    const onMenu = vi.fn()
    render(<Dock onMenu={onMenu} />)
    await userEvent.click(screen.getByRole('button', { name: 'Menu' }))
    expect(onMenu).toHaveBeenCalledOnce()
  })

  it('calls onPrompt when prompt button is clicked', async () => {
    const onPrompt = vi.fn()
    render(<Dock onPrompt={onPrompt} />)
    await userEvent.click(screen.getByRole('button', { name: 'Prompt' }))
    expect(onPrompt).toHaveBeenCalledOnce()
  })

  it('disables the prompt button when promptDisabled is true', () => {
    render(<Dock promptDisabled={true} />)
    expect(screen.getByRole('button', { name: 'Prompt' })).toBeDisabled()
  })

  it('does not call onPrompt when promptDisabled', async () => {
    const onPrompt = vi.fn()
    render(<Dock onPrompt={onPrompt} promptDisabled={true} />)
    await userEvent.click(screen.getByRole('button', { name: 'Prompt' }))
    expect(onPrompt).not.toHaveBeenCalled()
  })
})
