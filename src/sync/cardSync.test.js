import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { putCard } from '../card/cardStorage'
import { createCard } from '../card/createCard'
import { createCardSyncScheduler, pullRemoteCardsForUser, syncDirtyCardsForUser } from './cardSync'

const BASE_TS = 1_700_000_000_000

function makeRemoteRow(card, userId, overrides = {}) {
  return {
    id: card.id,
    user_id: userId,
    type: card.type,
    subtype: null,
    title: card.title,
    body: { kind: 'plain', text: card.body },
    config: {},
    location: card.location,
    content_hash: null,
    created_at: new Date(card.createdAt).toISOString(),
    updated_at: new Date(card.updatedAt).toISOString(),
    ...overrides,
  }
}

function makeFakeStorage(overrides = {}) {
  return {
    fetchRemoteCardsForUser: vi.fn().mockResolvedValue([]),
    fetchRemoteCardById: vi.fn().mockResolvedValue(null),
    upsertRemoteCard: vi.fn().mockImplementation((row) => Promise.resolve(row)),
    ...overrides,
  }
}

describe('syncDirtyCardsForUser', () => {
  const userId = 'user-123'

  beforeEach(async () => {
    await db.cards.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('card-uuid')
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TS)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('pushes a dirty local-only card to remote and marks it clean', async () => {
    const card = createCard({ title: 'Notes', body: 'Buy milk' })
    await putCard(card)

    const storage = makeFakeStorage()
    await syncDirtyCardsForUser(userId, storage)

    expect(storage.upsertRemoteCard).toHaveBeenCalledOnce()
    const upserted = storage.upsertRemoteCard.mock.calls[0][0]
    expect(upserted.id).toBe(card.id)
    expect(upserted.user_id).toBe(userId)
    expect(upserted.body).toEqual({ kind: 'plain', text: 'Buy milk' })

    const stored = await db.cards.get(card.id)
    expect(stored.dirty).toBe(false)
  })

  it('pushes local card when local is newer than remote', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TS + 5000)
    const card = createCard({ title: 'Updated', body: 'New body' })
    await putCard(card)

    const olderRemote = makeRemoteRow(card, userId, {
      updated_at: new Date(BASE_TS).toISOString(),
    })
    const storage = makeFakeStorage({
      fetchRemoteCardById: vi.fn().mockResolvedValue(olderRemote),
    })

    await syncDirtyCardsForUser(userId, storage)

    expect(storage.upsertRemoteCard).toHaveBeenCalledOnce()
    const stored = await db.cards.get(card.id)
    expect(stored.dirty).toBe(false)
  })

  it('pulls remote card when remote is newer and marks local clean', async () => {
    const card = createCard({ title: 'Old title', body: 'Old body' })
    await putCard(card)

    const newerRemote = makeRemoteRow(card, userId, {
      title: 'Remote title',
      body: { kind: 'plain', text: 'Remote body' },
      updated_at: new Date(BASE_TS + 10000).toISOString(),
    })
    const storage = makeFakeStorage({
      fetchRemoteCardById: vi.fn().mockResolvedValue(newerRemote),
    })

    await syncDirtyCardsForUser(userId, storage)

    expect(storage.upsertRemoteCard).not.toHaveBeenCalled()
    const stored = await db.cards.get(card.id)
    expect(stored.dirty).toBe(false)
    expect(stored.title).toBe('Remote title')
    expect(stored.body).toBe('Remote body')
  })

  it('marks card clean without remote call when already in sync', async () => {
    const card = createCard({ title: 'Synced', body: 'Same' })
    await putCard(card)

    const { computeContentHash } = await import('./cardSyncLogic')
    const hash = computeContentHash(card)
    const syncedRemote = makeRemoteRow(card, userId, {
      content_hash: hash,
      updated_at: new Date(BASE_TS).toISOString(),
    })
    const storage = makeFakeStorage({
      fetchRemoteCardById: vi.fn().mockResolvedValue(syncedRemote),
    })

    await syncDirtyCardsForUser(userId, storage)

    expect(storage.upsertRemoteCard).not.toHaveBeenCalled()
    const stored = await db.cards.get(card.id)
    expect(stored.dirty).toBe(false)
  })

  it('leaves card dirty and does not throw when sync errors', async () => {
    const card = createCard({ title: 'Error card', body: '' })
    await putCard(card)

    const storage = makeFakeStorage({
      fetchRemoteCardById: vi.fn().mockRejectedValue(new Error('Network error')),
    })

    await expect(syncDirtyCardsForUser(userId, storage)).resolves.toBeUndefined()

    const stored = await db.cards.get(card.id)
    expect(stored.dirty).toBe(true)
  })

  it('skips clean cards entirely', async () => {
    const card = createCard({ title: 'Clean card', body: '' })
    await db.cards.put({ ...card, dirty: false })

    const storage = makeFakeStorage()
    await syncDirtyCardsForUser(userId, storage)

    expect(storage.fetchRemoteCardById).not.toHaveBeenCalled()
    expect(storage.upsertRemoteCard).not.toHaveBeenCalled()
  })
})

describe('pullRemoteCardsForUser', () => {
  const userId = 'user-123'

  beforeEach(async () => {
    await db.cards.clear()
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('remote-card-id')
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TS)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes a remote-only card into Dexie and returns its id', async () => {
    const remoteRow = {
      id: 'remote-card-id',
      user_id: userId,
      type: 'text',
      title: 'From server',
      body: { kind: 'plain', text: 'Server body' },
      location: 'none',
      content_hash: 'abc',
      created_at: new Date(BASE_TS).toISOString(),
      updated_at: new Date(BASE_TS).toISOString(),
    }
    const storage = makeFakeStorage({
      fetchRemoteCardsForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    const newIds = await pullRemoteCardsForUser(userId, storage)

    expect(newIds).toEqual(['remote-card-id'])
    const stored = await db.cards.get('remote-card-id')
    expect(stored).toBeDefined()
    expect(stored.title).toBe('From server')
    expect(stored.body).toBe('Server body')
    expect(stored.dirty).toBe(false)
  })

  it('overwrites local card when remote is newer and local is clean', async () => {
    const card = createCard({ title: 'Old', body: 'Old body' })
    await db.cards.put({ ...card, dirty: false })

    const remoteRow = {
      id: card.id,
      user_id: userId,
      type: 'text',
      title: 'Newer',
      body: { kind: 'plain', text: 'Newer body' },
      location: 'none',
      content_hash: 'xyz',
      created_at: new Date(BASE_TS).toISOString(),
      updated_at: new Date(BASE_TS + 5000).toISOString(),
    }
    const storage = makeFakeStorage({
      fetchRemoteCardsForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    const newIds = await pullRemoteCardsForUser(userId, storage)

    expect(newIds).toEqual([])  // card already existed locally
    const stored = await db.cards.get(card.id)
    expect(stored.title).toBe('Newer')
  })

  it('does not overwrite a dirty local card even if remote is newer', async () => {
    const card = createCard({ title: 'Local edit', body: 'Unsaved' })
    await putCard(card)  // dirty: true

    const remoteRow = {
      id: card.id,
      user_id: userId,
      type: 'text',
      title: 'Remote',
      body: { kind: 'plain', text: 'Remote' },
      location: 'none',
      content_hash: null,
      created_at: new Date(BASE_TS).toISOString(),
      updated_at: new Date(BASE_TS + 5000).toISOString(),
    }
    const storage = makeFakeStorage({
      fetchRemoteCardsForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    await pullRemoteCardsForUser(userId, storage)

    const stored = await db.cards.get(card.id)
    expect(stored.title).toBe('Local edit')  // local preserved
    expect(stored.dirty).toBe(true)
  })

  it('does not overwrite local card when local is newer', async () => {
    const card = createCard({ title: 'Newer local', body: '' })
    await db.cards.put({ ...card, dirty: false, updatedAt: BASE_TS + 9000 })

    const remoteRow = {
      id: card.id,
      user_id: userId,
      type: 'text',
      title: 'Older remote',
      body: { kind: 'plain', text: '' },
      location: 'none',
      content_hash: null,
      created_at: new Date(BASE_TS).toISOString(),
      updated_at: new Date(BASE_TS).toISOString(),
    }
    const storage = makeFakeStorage({
      fetchRemoteCardsForUser: vi.fn().mockResolvedValue([remoteRow]),
    })

    await pullRemoteCardsForUser(userId, storage)

    const stored = await db.cards.get(card.id)
    expect(stored.title).toBe('Newer local')
  })

  it('returns empty array when no remote cards exist', async () => {
    const storage = makeFakeStorage()
    const newIds = await pullRemoteCardsForUser(userId, storage)
    expect(newIds).toEqual([])
  })
})

describe('createCardSyncScheduler', () => {
  const userId = 'user-123'

  beforeEach(async () => {
    await db.cards.clear()
    // Only fake setTimeout/clearTimeout — IndexedDB relies on microtasks that
    // break when the full timer suite is replaced.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('scheduleSync debounces multiple calls into one push (no pull)', async () => {
    vi.spyOn(db.cards, 'toArray').mockResolvedValue([])
    const storage = makeFakeStorage()

    const scheduler = createCardSyncScheduler({ userId, debounceMs: 500, storage })

    scheduler.scheduleSync()
    scheduler.scheduleSync()
    scheduler.scheduleSync()

    expect(storage.fetchRemoteCardsForUser).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(600)

    // scheduleSync only calls syncDirty, not pullRemote
    expect(storage.fetchRemoteCardsForUser).not.toHaveBeenCalled()
    expect(storage.upsertRemoteCard).not.toHaveBeenCalled()
  })

  it('runNow pulls remote cards then syncs dirty local cards', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(BASE_TS)
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('card-uuid')
    const storage = makeFakeStorage({
      fetchRemoteCardsForUser: vi.fn().mockResolvedValue([
        {
          id: 'remote-only',
          type: 'text',
          title: 'Remote card',
          body: { kind: 'plain', text: 'body' },
          location: 'none',
          content_hash: null,
          created_at: new Date(BASE_TS).toISOString(),
          updated_at: new Date(BASE_TS).toISOString(),
        },
      ]),
    })

    const scheduler = createCardSyncScheduler({ userId, debounceMs: 5000, storage })
    await scheduler.runNow()

    // pullRemoteCardsForUser ran
    expect(storage.fetchRemoteCardsForUser).toHaveBeenCalledOnce()
    // remote card is now in Dexie
    const stored = await db.cards.get('remote-only')
    expect(stored?.title).toBe('Remote card')
  })

  it('runNow cancels pending debounce and runs exactly once', async () => {
    vi.spyOn(db.cards, 'toArray').mockResolvedValue([])
    const storage = makeFakeStorage()

    const scheduler = createCardSyncScheduler({ userId, debounceMs: 5000, storage })
    scheduler.scheduleSync()

    await scheduler.runNow()

    // Advance past the original debounce — should NOT fire a second time
    await vi.advanceTimersByTimeAsync(6000)

    // fetchRemoteCardsForUser only called by runNow (once), not by the cancelled debounce
    expect(storage.fetchRemoteCardsForUser).toHaveBeenCalledTimes(1)
  })
})
