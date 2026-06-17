import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Sidebar } from './Sidebar'

const baseProps = {
  open: false,
  onClose: () => {},
  vaultView: 'shelf',
  onChangeVaultView: () => {},
  shelfEntries: [],
  libraryEntries: [],
  folders: [],
}

describe('Sidebar', () => {
  it('renders the brand name', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getByText('olive')).toBeInTheDocument()
  })

  it('renders the Vault section heading', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getByText('Vault')).toBeInTheDocument()
  })

  it('renders the Brain section heading', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getByText('Brain')).toBeInTheDocument()
  })

  it('renders the Shelf and Library tabs', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getByRole('tab', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument()
  })

  it('shows shelf empty state when vault view is shelf and no entries', () => {
    render(<Sidebar {...baseProps} vaultView="shelf" shelfEntries={[]} />)
    expect(screen.getByText(/Shelf is empty/)).toBeInTheDocument()
  })

  it('calls onChangeVaultView when Library tab is clicked', async () => {
    const onChangeVaultView = vi.fn()
    render(<Sidebar {...baseProps} onChangeVaultView={onChangeVaultView} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Library' }))
    expect(onChangeVaultView).toHaveBeenCalledWith('library')
  })

  it('renders a close button', () => {
    render(<Sidebar {...baseProps} open={true} />)
    expect(screen.getByRole('button', { name: 'Close sidebar' })).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<Sidebar {...baseProps} open={true} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close sidebar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders brain placeholder text', () => {
    render(<Sidebar {...baseProps} />)
    expect(screen.getByText(/coming soon/)).toBeInTheDocument()
  })
})
