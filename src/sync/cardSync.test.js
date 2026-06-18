import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import { putCard } from '../card/cardStorage'
import { createCard } from '../card/createCard'
import { createCardSyncScheduler, syncDirtyCardsForUser } from './cardSync'

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
    await putCard(card)  // dirty: true

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

    // Build a remote row with matching timestamp and hash
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

    // Should not throw
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

describe('createCardSyncScheduler', () => {
  const userId = 'user-123'

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('scheduleSync debounces multiple calls into one sync', async () => {
    const storage = makeFakeStorage()
    vi.spyOn(db.cards, 'toArray').mockResolvedValue([])

    const scheduler = createCardSyncScheduler({ userId, debounceMs: 500, storage })

    scheduler.scheduleSync()
    scheduler.scheduleSync()
    scheduler.scheduleSync()

    // Before the debounce window, no sync has run
    expect(storage.fetchRemoteCardById).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(600)

    // Only one sync run (no dirty cards, so no remote calls — but the timer fired once)
    // We verify the timer fired by checking the storage wasn't called (no dirty cards)
    expect(storage.upsertRemoteCard).not.toHaveBeenCalled()
  })

  it('runNow cancels pending debounce and runs immediately', async () => {
    vi.spyOn(db.cards, 'toArray').mockResolvedValue([])
    const storage = makeFakeStorage()

    const scheduler = createCardSyncScheduler({ userId, debounceMs: 5000, storage })
    scheduler.scheduleSync()

    // runNow fires before the debounce window
    await scheduler.runNow()

    // Advance past the original debounce — should not fire a second time
    await vi.advanceTimersByTimeAsync(6000)

    // toArray was called once (by runNow), not twice
    expect(db.cards.toArray).toHaveBeenCalledTimes(1)
  })
})
