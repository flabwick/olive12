import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TransientCard } from './TransientCard'

describe('TransientCard', () => {
  it('renders a title input and body textarea', () => {
    render(<TransientCard />)
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Body')).toBeInTheDocument()
  })

  it('renders card type buttons', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Process' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Portal' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Container' })).toBeInTheDocument()
  })

  it('Text type button is enabled and selected by default', () => {
    render(<TransientCard />)
    const text = screen.getByRole('button', { name: 'Text' })
    expect(text).not.toBeDisabled()
    expect(text).toHaveAttribute('aria-pressed', 'true')
  })

  it('Process and Container buttons are disabled', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: 'Process' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Container' })).toBeDisabled()
  })

  it('Portal button is enabled', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: 'Portal' })).not.toBeDisabled()
  })

  it('calls onSubmit with title and body on submit', async () => {
    const onSubmit = vi.fn()
    render(<TransientCard onSubmit={onSubmit} />)
    await userEvent.type(screen.getByLabelText('Title'), 'My note')
    await userEvent.type(screen.getByLabelText('Body'), 'Some content')
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onSubmit).toHaveBeenCalledWith({ title: 'My note', body: 'Some content' })
  })

  it('calls onDismiss when Cancel is clicked', async () => {
    const onDismiss = vi.fn()
    render(<TransientCard onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('calls onDismiss when Dismiss (✕) is clicked', async () => {
    const onDismiss = vi.fn()
    render(<TransientCard onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('renders an Add button', () => {
    render(<TransientCard />)
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
  })

  it('calls onSubmit with empty strings if nothing typed', async () => {
    const onSubmit = vi.fn()
    render(<TransientCard onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('button', { name: /add/i }))
    expect(onSubmit).toHaveBeenCalledWith({ title: '', body: '' })
  })

  describe('portal search', () => {
    const shelfEntries = [
      { id: 's1', title: 'Match me', type: 'text', createdAt: 1 },
      { id: 's2', title: 'No match here', type: 'text', createdAt: 2 },
    ]
    const libraryEntries = [
      { id: 'l1', title: 'Library match', type: 'text', folderId: null, createdAt: 3 },
    ]

    it('clicking Portal button shows the vault search input', async () => {
      render(<TransientCard shelfEntries={[]} libraryEntries={[]} />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      expect(screen.getByLabelText('Search vault cards')).toBeInTheDocument()
    })

    it('clicking Portal button hides the text form', async () => {
      render(<TransientCard />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument()
    })

    it('typing in search filters results by title', async () => {
      render(<TransientCard shelfEntries={shelfEntries} libraryEntries={[]} />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      await userEvent.type(screen.getByLabelText('Search vault cards'), 'match me')
      expect(screen.getByRole('button', { name: 'Match me' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'No match here' })).not.toBeInTheDocument()
    })

    it('search is case-insensitive', async () => {
      render(<TransientCard shelfEntries={shelfEntries} libraryEntries={[]} />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      await userEvent.type(screen.getByLabelText('Search vault cards'), 'MATCH ME')
      expect(screen.getByRole('button', { name: 'Match me' })).toBeInTheDocument()
    })

    it('clicking a result calls onSubmitPortal with the card id', async () => {
      const onSubmitPortal = vi.fn()
      render(
        <TransientCard
          shelfEntries={shelfEntries}
          libraryEntries={[]}
          onSubmitPortal={onSubmitPortal}
        />,
      )
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      await userEvent.type(screen.getByLabelText('Search vault cards'), 'match me')
      await userEvent.click(screen.getByRole('button', { name: 'Match me' }))
      expect(onSubmitPortal).toHaveBeenCalledWith('s1')
    })

    it('searches across both shelfEntries and libraryEntries', async () => {
      render(<TransientCard shelfEntries={shelfEntries} libraryEntries={libraryEntries} />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      await userEvent.type(screen.getByLabelText('Search vault cards'), 'match')
      expect(screen.getByRole('button', { name: 'Match me' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Library match' })).toBeInTheDocument()
    })

    it('shows no results when query does not match any card', async () => {
      render(<TransientCard shelfEntries={shelfEntries} libraryEntries={[]} />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      await userEvent.type(screen.getByLabelText('Search vault cards'), 'xyzzy')
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.getByText('No matching cards.')).toBeInTheDocument()
    })

    it('shows no results and no empty message when search is empty', async () => {
      render(<TransientCard shelfEntries={shelfEntries} libraryEntries={[]} />)
      await userEvent.click(screen.getByRole('button', { name: 'Portal' }))
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
      expect(screen.queryByText('No matching cards.')).not.toBeInTheDocument()
    })
  })
})
