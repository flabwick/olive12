import { render, screen, waitFor } from '@testing-library/react'
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
const T = 1_700_000_000_000

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

async function seedTab(id = 'seeded-tab', name = 'Main') {
  await db.tabs.put({ id, name, kind: 'blank', order: 0, savedLocation: 'none', savedFolderId: null, createdAt: T, updatedAt: T })
}

async function seedCard(id = 'seeded-card', title = 'Vault note') {
  await db.cards.put({ id, type: 'text', title, body: '', back: '', config: null, location: 'none', folderId: null, createdAt: T, updatedAt: T, dirty: true })
}

async function seedTabCard(tabId = 'seeded-tab', cardId = 'seeded-card') {
  await db.tab_cards.put({ tabId, cardId, position: 0, foldState: false, hiddenState: false })
}

// ── Test setup ───────────────────────────────────────────────────────────────
describe('App', () => {
  beforeEach(async () => {
    await db.cards.clear()
    await db.tabs.clear()
    await db.tab_cards.clear()
    await db.folders.clear()
    await db.links.clear()
    await db.dock_cards.clear()
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
    await db.dock_cards.clear()
    vi.unstubAllGlobals()
  })

  // ── App shell / dock rendering ───────────────────────────────────────────
  it('renders the dock with a Library button and Pin new card button', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Library' }))
    expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pin new card' })).toBeInTheDocument()
  })

  // ── Folder panel tests ───────────────────────────────────────────────────
  it('clicking Library opens the folder panel', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Library' }))
    expect(screen.getByRole('dialog', { name: 'Vault and Brain' })).toBeInTheDocument()
  })

  it('dock shows Shelf, Library and Brain tab buttons when vault is open', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Library' }))
    await waitFor(() => screen.getByRole('dialog', { name: 'Vault and Brain' }))
    expect(screen.getByRole('button', { name: 'Shelf' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Library' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Brain' })).toBeInTheDocument()
  })

  it('closing the folder panel via Close vault button removes it from the screen', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Library' }))
    await userEvent.click(screen.getByRole('button', { name: 'Library' }))
    await waitFor(() => screen.getByRole('button', { name: 'Close vault' }))
    await userEvent.click(screen.getByRole('button', { name: 'Close vault' }))
    expect(screen.queryByRole('dialog', { name: 'Vault and Brain' })).not.toBeInTheDocument()
  })

  // ── Settings / IndexDebugPanel tests ────────────────────────────────────
  it('clicking Settings opens the index debug panel', async () => {
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Settings' }))
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('dialog', { name: 'Index pipeline debug' })).toBeInTheDocument()
  })

  it('clicking Pin new card shows the dock card panel', async () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('new-dock-card')
    vi.spyOn(Date, 'now').mockReturnValue(T)
    render(<App />)
    await waitFor(() => screen.getByRole('button', { name: 'Pin new card' }))
    await userEvent.click(screen.getByRole('button', { name: 'Pin new card' }))
    await waitFor(() => screen.getByRole('complementary', { name: 'Dock card' }))
    expect(screen.getByRole('complementary', { name: 'Dock card' })).toBeInTheDocument()
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
      expect(screen.queryByRole('button', { name: 'Library' })).not.toBeInTheDocument()
    })

    it('shows the app shell when logged in', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Library' }))
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
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('portal-1')
      vi.spyOn(Date, 'now').mockReturnValue(T)

      await seedTab()
      await seedCard('seeded-card', 'Vault note')
      await seedTabCard()

      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Save card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save card' }))

      await waitFor(() => screen.getByRole('heading', { name: 'Vault note' }))
      expect(document.querySelector('.portal-card')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save card' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
    })

    it('after refresh, saved card appears once as a portal with no tick icon', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('portal-1')
      vi.spyOn(Date, 'now').mockReturnValue(T)

      await seedTab()
      await seedCard('seeded-card', 'Persist me')
      await seedTabCard()

      const { unmount } = render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Save card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save card' }))
      await waitFor(() => screen.getByRole('heading', { name: 'Persist me' }))

      unmount()
      render(<App />)
      await waitFor(() => screen.getByRole('heading', { name: 'Persist me' }))

      expect(screen.getAllByRole('heading', { name: 'Persist me' })).toHaveLength(1)
      expect(document.querySelector('.portal-card')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Save card' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Saved to Shelf — click to move to Library' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'In Library' })).not.toBeInTheDocument()
    })

    it('closing a portal removes it from the tab but keeps the card on the shelf', async () => {
      vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('portal-1')
      vi.spyOn(Date, 'now').mockReturnValue(T)

      await seedTab()
      await seedCard('seeded-card', 'Keep on shelf')
      await seedTabCard()

      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Save card' }))
      await userEvent.click(screen.getByRole('button', { name: 'Save card' }))
      await waitFor(() => screen.getByRole('heading', { name: 'Keep on shelf' }))

      await userEvent.click(screen.getByRole('button', { name: 'Remove card' }))
      await waitFor(() => screen.getByText('No cards yet.'))

      await userEvent.click(screen.getByRole('button', { name: 'Library' }))
      await waitFor(() => screen.getByRole('dialog', { name: 'Vault and Brain' }))
      expect(screen.getByText('Keep on shelf')).toBeInTheDocument()
    })
  })

  // ── Tab switcher via TabHeader ───────────────────────────────────────────
  describe('tab switcher lifecycle', () => {
    it('clicking Tab overview button opens the tab switcher dialog', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      await waitFor(() => screen.getByRole('dialog', { name: 'Tab switcher' }))
      expect(screen.getByRole('dialog', { name: 'Tab switcher' })).toBeInTheDocument()
    })

    it('tab switcher shows the current tab and a New tab tile', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      await waitFor(() => screen.getByRole('dialog', { name: 'Tab switcher' }))
      expect(screen.getByRole('button', { name: 'New tab' })).toBeInTheDocument()
    })

    it('pressing Escape closes the tab switcher', async () => {
      render(<App />)
      await waitFor(() => screen.getByRole('button', { name: 'Tab overview' }))
      await userEvent.click(screen.getByRole('button', { name: 'Tab overview' }))
      await waitFor(() => screen.getByRole('dialog', { name: 'Tab switcher' }))
      await userEvent.keyboard('{Escape}')
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Tab switcher' })).not.toBeInTheDocument())
    })
  })
})
