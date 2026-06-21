import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './db/vaultDb'
import App from './App'

// ── Supabase auth mock ──────────────────────────────────────────────────────
const authMocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  onAuthStateChange: vi.fn(() => ({
    data: { subscription: { unsubscribe: vi.fn() } },
  })),
}))

const invokeMock = vi.hoisted(() => vi.fn())

vi.mock('./lib/supabaseClient', () => ({
  supabase: { auth: authMocks, functions: { invoke: invokeMock } },
}))

// ── Sync module mocks (prevent real Supabase calls from useTabs) ────────────
const syncMocks = vi.hoisted(() => ({
  scheduleSync: vi.fn(),
  runNow: vi.fn().mockResolvedValue(undefined),
  createCardSyncScheduler: vi.fn(),
}))

vi.mock('./sync/cardSync', () => ({
  createCardSyncScheduler: syncMocks.createCardSyncScheduler,
  syncDirtyCardsForUser: vi.fn(),
}))

const deleteRemoteMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined))

vi.mock('./sync/cardSupabaseStorage', () => ({
  makeCardSupabaseStorage: vi.fn(() => ({ deleteRemoteCard: deleteRemoteMock })),
}))

// ── Helpers ─────────────────────────────────────────────────────────────────
function mockLoggedIn(id = 'test-user') {
  authMocks.getSession.mockResolvedValue({
    data: { session: { user: { id } } },
  })
  syncMocks.createCardSyncScheduler.mockReturnValue({
    scheduleSync: syncMocks.scheduleSync,
    runNow: syncMocks.runNow,
  })
}

function mockLoggedOut() {
  authMocks.getSession.mockResolvedValue({ data: { session: null } })
}

// ── Test setup ───────────────────────────────────────────────────────────────
describe('App', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
    await db.folders.clear()
    await db.links.clear()
    authMocks.signInWithPassword.mockReset()
    authMocks.signUp.mockReset()
    syncMocks.scheduleSync.mockClear()
    syncMocks.runNow.mockClear()
    syncMocks.createCardSyncScheduler.mockClear()
    deleteRemoteMock.mockClear()
    invokeMock.mockClear()
    mockLoggedIn()
  })

  afterEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
    await db.folders.clear()
    await db.links.clear()
    vi.unstubAllGlobals()
  })

  // ── Existing app shell tests (unchanged behaviour) ───────────────────────
  it('renders the dock with an Add card button', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByRole('button', { name: 'Add card' })).toBeInTheDocument()
  })

  it('opens the transient card when Add card is clicked', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Body')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add →/i })).toBeInTheDocument()
  })

  it('disables the dock + button while transient card is open', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    expect(screen.getByRole('button', { name: 'Add card' })).toBeDisabled()
  })

  it('submitting the transient card creates a card and closes the form', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await userEvent.type(screen.getByLabelText('Title'), 'My note')
    await userEvent.type(screen.getByLabelText('Body'), 'Some body')
    await userEvent.click(screen.getByRole('button', { name: /add →/i }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    await waitFor(() => screen.getByRole('heading', { name: 'My note' }))
    expect(screen.getByRole('heading', { name: 'My note' })).toBeInTheDocument()
  })

  it('cancelling the transient card closes it without adding a card', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(screen.queryByLabelText('Title')).not.toBeInTheDocument()
    expect(screen.getByText('No cards yet.')).toBeInTheDocument()
  })

  it('clicking Folders opens the folder panel', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Folders' }))
    await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
    expect(screen.getByRole('dialog', { name: 'Vault and Brain' })).toBeInTheDocument()
  })

  it('folder panel shows Shelf, Library and Brain tabs', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Folders' }))
    await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
    expect(screen.getByRole('tab', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Brain' })).toBeInTheDocument()
  })

  it('closing the folder panel via X removes it from the screen', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Folders' }))
    await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Vault and Brain' })).not.toBeInTheDocument()
  })

  // ── Prompt mode tests ────────────────────────────────────────────────────
  it('renders the Prompt button in the dock', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Prompt' }))
    expect(screen.getByRole('button', { name: 'Prompt' })).toBeInTheDocument()
  })

  it('clicking Prompt opens the DockPrompt form', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Prompt' }))
    await userEvent.click(screen.getByRole('button', { name: 'Prompt' }))
    expect(screen.getByRole('textbox', { name: 'Prompt input' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send →' })).toBeInTheDocument()
  })

  it('clicking Cancel in DockPrompt closes it', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Prompt' }))
    await userEvent.click(screen.getByRole('button', { name: 'Prompt' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('textbox', { name: 'Prompt input' })).not.toBeInTheDocument()
  })

  it('submitting DockPrompt streams a card via fetch and creates a card on success', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('uuid')
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
    vi.stubGlobal('requestAnimationFrame', (fn) => { fn(0); return 0 })
    vi.stubGlobal('cancelAnimationFrame', () => {})
    const encoder = new TextEncoder()
    const sseBody = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"AI result"}}]}\n'))
        controller.enqueue(encoder.encode('data: {"choices":[{"delta":{"content":"\\n\\nAI body"}}]}\n'))
        controller.enqueue(encoder.encode('data: [DONE]\n'))
        controller.close()
      },
    })
    const sseResponse = new Response(sseBody, { status: 200, headers: { 'Content-Type': 'text/event-stream' } })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(sseResponse))

    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Prompt' }))
    await userEvent.click(screen.getByRole('button', { name: 'Prompt' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Prompt input' }), 'Make a card')
    await userEvent.click(screen.getByRole('button', { name: 'Send →' }))

    await waitFor(() => screen.getByRole('heading', { name: 'AI result' }))
    expect(screen.getByRole('heading', { name: 'AI result' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Prompt input' })).not.toBeInTheDocument())
  })

  // ── Tab switcher tests ───────────────────────────────────────────────────
  describe('tab switcher', () => {
    it('tab overview button opens the tab switcher', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      expect(screen.getByRole('dialog', { name: 'Tab switcher' })).toBeInTheDocument()
    })

    it('closing the tab switcher removes it from the screen', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByRole('dialog', { name: 'Tab switcher' })).not.toBeInTheDocument()
    })

    it('creating a new tab from the switcher adds a tab', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))

      const initialTiles = document.querySelectorAll('.tab-switcher__tile:not(.tab-switcher__tile--add)')
      const initialCount = initialTiles.length

      await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))

      await waitFor(() => {
        const tiles = document.querySelectorAll('.tab-switcher__tile:not(.tab-switcher__tile--add)')
        expect(tiles.length).toBe(initialCount + 1)
      })
    })

    it('switching tabs via the switcher changes the active tab header', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('tab-2')

      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'New tab' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))

      const tiles = document.querySelectorAll('.tab-switcher__tile:not(.tab-switcher__tile--add)')
      await userEvent.click(tiles[0])

      expect(screen.queryByRole('dialog', { name: 'Tab switcher' })).not.toBeInTheDocument()
    })
  })

  // ── Auth gate tests ──────────────────────────────────────────────────────
  describe('auth gate', () => {
    it('shows sign-in form when not logged in', async () => {
      mockLoggedOut()
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Sign in' }))
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('does not show the dock when not logged in', async () => {
      mockLoggedOut()
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Sign in' }))
      expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument()
    })

    it('shows the app shell when logged in', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
      expect(screen.queryByRole('button', { name: 'Sign in' })).not.toBeInTheDocument()
    })

    it('calls supabase.auth.signInWithPassword when Sign in is submitted', async () => {
      mockLoggedOut()
      authMocks.signInWithPassword.mockResolvedValue({ error: null })
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Sign in' }))
      await userEvent.type(screen.getByLabelText('Email'), 'dev@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'password123')
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      expect(authMocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'dev@example.com',
        password: 'password123',
      })
    })

    it('calls supabase.auth.signUp when Sign up is submitted', async () => {
      mockLoggedOut()
      authMocks.signUp.mockResolvedValue({ error: null })
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Sign up' }))
      await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'newpass99')
      await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
      expect(authMocks.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'newpass99',
      })
    })

    it('displays auth error when sign-in fails', async () => {
      mockLoggedOut()
      authMocks.signInWithPassword.mockResolvedValue({
        error: { message: 'Invalid login credentials' },
      })
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Sign in' }))
      await userEvent.type(screen.getByLabelText('Email'), 'bad@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'wrongpass')
      await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
      await waitFor(() => screen.getByRole('alert'))
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid login credentials')
    })

    it('shows confirmation message after sign-up', async () => {
      mockLoggedOut()
      authMocks.signUp.mockResolvedValue({ error: null })
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Sign up' }))
      await userEvent.type(screen.getByLabelText('Email'), 'new@example.com')
      await userEvent.type(screen.getByLabelText('Password'), 'newpass99')
      await userEvent.click(screen.getByRole('button', { name: 'Sign up' }))
      await waitFor(() => screen.getByRole('alert'))
      expect(screen.getByRole('alert')).toHaveTextContent('Check your email')
    })
  })

  // ── Vault / portal lifecycle (save, refresh, close) ─────────────────────
  describe('vault card lifecycle', () => {
    it('save to shelf converts the tab card to a portal with no tick icon', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('card-1')
        .mockReturnValueOnce('portal-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
      await userEvent.type(screen.getByLabelText('Title'), 'Vault note')
      await userEvent.click(screen.getByRole('button', { name: /add →/i }))

      await waitFor(() => screen.getByRole('button', { name: 'Save to Shelf' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save to Shelf' }))

      await waitFor(() => screen.getByRole('heading', { name: 'Vault note' }))
      expect(document.querySelector('.portal-card')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
    })

    it('after refresh, saved card appears once as a portal with no tick icon', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('card-1')
        .mockReturnValueOnce('portal-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      const { unmount } = render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
      await userEvent.type(screen.getByLabelText('Title'), 'Persist me')
      await userEvent.click(screen.getByRole('button', { name: /add →/i }))
      await waitFor(() => screen.getByRole('button', { name: 'Save to Shelf' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save to Shelf' }))
      await waitFor(() => screen.getByRole('heading', { name: 'Persist me' }))

      unmount()
      render(<App />)
      await waitFor(() => screen.getByRole('heading', { name: 'Persist me' }))

      expect(screen.getAllByRole('heading', { name: 'Persist me' })).toHaveLength(1)
      expect(document.querySelector('.portal-card')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save to Shelf' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
    })

    it('closing a portal removes it from the tab but keeps the card on the shelf', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('card-1')
        .mockReturnValueOnce('portal-1')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
      await userEvent.type(screen.getByLabelText('Title'), 'Keep on shelf')
      await userEvent.click(screen.getByRole('button', { name: /add →/i }))
      await waitFor(() => screen.getByRole('button', { name: 'Save to Shelf' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save to Shelf' }))
      await waitFor(() => screen.getByRole('heading', { name: 'Keep on shelf' }))

      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      await waitFor(() => screen.getByText('No cards yet.'))

      await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
      await waitFor(() => screen.getByRole('dialog', { name: 'Vault and Brain' }))
      expect(screen.getByText('Keep on shelf')).toBeInTheDocument()
    })
  })

  describe('saved tab lifecycle', () => {
    it('closing a saved tab from the switcher keeps it on the shelf and allows reopening with cards', async () => {
      vi.spyOn(crypto, 'randomUUID')
        .mockReturnValueOnce('tab-1')
        .mockReturnValueOnce('card-1')
        .mockReturnValueOnce('tab-fallback')
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)

      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Add card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Add card' }))
      await userEvent.type(screen.getByLabelText('Title'), 'Inside tab')
      await userEvent.click(screen.getByRole('button', { name: /add →/i }))
      await waitFor(() => screen.getByRole('heading', { name: 'Inside tab' }))

      await userEvent.click(screen.getByRole('heading', { level: 2 }))
      const tabNameInput = screen.getByDisplayValue('Main')
      await userEvent.clear(tabNameInput)
      await userEvent.type(tabNameInput, 'Saved workspace')
      await userEvent.keyboard('{Enter}')
      await userEvent.click(screen.getByRole('button', { name: 'Save tab to Shelf' }))

      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Close Saved workspace' }))
      fireEvent.keyDown(document, { key: 'Escape' })

      await userEvent.click(screen.getByRole('button', { name: 'Folders' }))
      await waitFor(() => screen.getByRole('dialog', { name: 'Vault and Brain' }))
      expect(screen.getByText('Saved workspace')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'Switch to tab' }))
      await waitFor(() => screen.getByRole('heading', { name: 'Inside tab' }))
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Saved workspace')
    })
  })
})
