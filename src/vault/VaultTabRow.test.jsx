import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VaultTabRow } from './VaultTabRow'

const tab = {
  id: 'tab-1',
  name: 'Research tab',
  savedLocation: 'shelf',
  savedFolderId: null,
  createdAt: new Date('2024-03-15').getTime(),
  updatedAt: new Date('2024-03-15').getTime(),
}

describe('VaultTabRow', () => {
  it('renders tab name', () => {
    render(<VaultTabRow tab={tab} />)
    expect(screen.getByText('Research tab')).toBeInTheDocument()
  })

  it('renders "tab" type badge', () => {
    render(<VaultTabRow tab={tab} />)
    expect(screen.getByText('tab')).toBeInTheDocument()
  })

  it('renders formatted creation date', () => {
    render(<VaultTabRow tab={tab} />)
    expect(screen.getByText(/Mar/)).toBeInTheDocument()
  })

  it('renders Switch to tab button when onOpen is provided', () => {
    render(<VaultTabRow tab={tab} onOpen={() => {}} />)
    expect(screen.getByRole('button', { name: 'Switch to tab' })).toBeInTheDocument()
  })

  it('does not render Switch to tab button when onOpen is absent', () => {
    render(<VaultTabRow tab={tab} />)
    expect(screen.queryByRole('button', { name: 'Switch to tab' })).not.toBeInTheDocument()
  })

  it('calls onOpen with tab id when Switch to tab is clicked', async () => {
    const onOpen = vi.fn()
    render(<VaultTabRow tab={tab} onOpen={onOpen} />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to tab' }))
    expect(onOpen).toHaveBeenCalledWith('tab-1')
  })

  it('renders Move to Library button when onMoveToLibrary is provided', () => {
    render(<VaultTabRow tab={tab} onMoveToLibrary={() => {}} />)
    expect(screen.getByRole('button', { name: 'Move to Library' })).toBeInTheDocument()
  })

  it('does not render Move to Library button when onMoveToLibrary is absent', () => {
    render(<VaultTabRow tab={tab} />)
    expect(screen.queryByRole('button', { name: 'Move to Library' })).not.toBeInTheDocument()
  })

  it('calls onMoveToLibrary when Move to Library is clicked', async () => {
    const onMoveToLibrary = vi.fn()
    render(<VaultTabRow tab={tab} onMoveToLibrary={onMoveToLibrary} />)
    await userEvent.click(screen.getByRole('button', { name: 'Move to Library' }))
    expect(onMoveToLibrary).toHaveBeenCalledOnce()
  })
})
