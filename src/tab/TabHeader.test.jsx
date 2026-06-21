import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TabHeader } from './TabHeader'

describe('TabHeader', () => {
  it('renders tab name as h2', () => {
    render(<TabHeader name="My Tab" savedLocation="none" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('My Tab')
  })

  it('clicking name enters edit mode (input visible, h2 hidden)', async () => {
    render(<TabHeader name="My Tab" savedLocation="none" />)
    fireEvent.click(screen.getByRole('heading'))
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('blur commits rename when value changed', async () => {
    const onRename = vi.fn()
    render(<TabHeader name="Old" savedLocation="none" onRename={onRename} />)
    fireEvent.click(screen.getByRole('heading'))
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'New')
    fireEvent.blur(input)
    expect(onRename).toHaveBeenCalledWith('New')
  })

  it('blur does not call onRename when value unchanged', async () => {
    const onRename = vi.fn()
    render(<TabHeader name="Same" savedLocation="none" onRename={onRename} />)
    fireEvent.click(screen.getByRole('heading'))
    const input = screen.getByRole('textbox')
    fireEvent.blur(input)
    expect(onRename).not.toHaveBeenCalled()
  })

  it('Enter commits rename', async () => {
    const onRename = vi.fn()
    render(<TabHeader name="Old" savedLocation="none" onRename={onRename} />)
    fireEvent.click(screen.getByRole('heading'))
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'New{Enter}')
    expect(onRename).toHaveBeenCalledWith('New')
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('Escape cancels without calling onRename', async () => {
    const onRename = vi.fn()
    render(<TabHeader name="Original" savedLocation="none" onRename={onRename} />)
    fireEvent.click(screen.getByRole('heading'))
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, 'Changed')
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onRename).not.toHaveBeenCalled()
    expect(screen.getByRole('heading')).toBeInTheDocument()
  })

  it('save button with savedLocation none calls onSaveToShelf', () => {
    const onSaveToShelf = vi.fn()
    render(<TabHeader name="Tab" savedLocation="none" onSaveToShelf={onSaveToShelf} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save tab to Shelf' }))
    expect(onSaveToShelf).toHaveBeenCalledOnce()
  })

  it('save button with savedLocation shelf calls onMoveToLibrary', () => {
    const onMoveToLibrary = vi.fn()
    render(<TabHeader name="Tab" savedLocation="shelf" onSaveToShelf={vi.fn()} onMoveToLibrary={onMoveToLibrary} />)
    fireEvent.click(screen.getByRole('button', { name: /move to Library/i }))
    expect(onMoveToLibrary).toHaveBeenCalledOnce()
  })

  it('save button with savedLocation library is disabled', () => {
    render(<TabHeader name="Tab" savedLocation="library" onSaveToShelf={vi.fn()} onMoveToLibrary={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tab in Library' })).toBeDisabled()
  })

  it('no buttons rendered when no callbacks provided and savedLocation is none', () => {
    render(<TabHeader name="Tab" savedLocation="none" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('renders Tab overview button when onTabOverview is provided', () => {
    render(<TabHeader name="Tab" savedLocation="none" onTabOverview={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Tab overview' })).toBeInTheDocument()
  })

  it('clicking Tab overview button calls onTabOverview', () => {
    const onTabOverview = vi.fn()
    render(<TabHeader name="Tab" savedLocation="none" onTabOverview={onTabOverview} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
    expect(onTabOverview).toHaveBeenCalledOnce()
  })

  it('shows (untitled) placeholder when name is empty', () => {
    render(<TabHeader name="" savedLocation="none" />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('(untitled)')
  })
})
