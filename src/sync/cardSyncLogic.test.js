import { describe, expect, it } from 'vitest'
import { classifyCardSync, computeContentHash, resolveCardConflict } from './cardSyncLogic'

describe('computeContentHash', () => {
  it('returns the same hash for identical inputs', () => {
    const card = { body: 'hello world', config: {} }
    expect(computeContentHash(card)).toBe(computeContentHash(card))
  })

  it('returns different hashes for different body values', () => {
    const a = { body: 'hello', config: {} }
    const b = { body: 'goodbye', config: {} }
    expect(computeContentHash(a)).not.toBe(computeContentHash(b))
  })

  it('returns different hashes for different config values', () => {
    const a = { body: 'hello', config: {} }
    const b = { body: 'hello', config: { color: 'red' } }
    expect(computeContentHash(a)).not.toBe(computeContentHash(b))
  })

  it('treats missing body as empty string', () => {
    const a = { body: '', config: {} }
    const b = { config: {} }
    expect(computeContentHash(a)).toBe(computeContentHash(b))
  })

  it('treats missing config as empty object', () => {
    const a = { body: 'hi', config: {} }
    const b = { body: 'hi' }
    expect(computeContentHash(a)).toBe(computeContentHash(b))
  })

  it('produces a non-empty hex string', () => {
    const hash = computeContentHash({ body: 'test', config: {} })
    expect(typeof hash).toBe('string')
    expect(hash.length).toBeGreaterThan(0)
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true)
  })
})

describe('classifyCardSync', () => {
  const makeLocal = (updatedAt, content_hash = null) => ({ updatedAt, content_hash })
  const makeRemote = (updated_at, content_hash = null) => ({
    updated_at: new Date(updated_at).toISOString(),
    content_hash,
  })

  it('returns LOCAL_ONLY when remoteCard is null', () => {
    expect(classifyCardSync(makeLocal(1000), null)).toBe('LOCAL_ONLY')
  })

  it('returns LOCAL_ONLY when remoteCard is undefined', () => {
    expect(classifyCardSync(makeLocal(1000), undefined)).toBe('LOCAL_ONLY')
  })

  it('returns REMOTE_ONLY when localCard is null', () => {
    expect(classifyCardSync(null, makeRemote(1000))).toBe('REMOTE_ONLY')
  })

  it('returns IN_SYNC when timestamps and hashes both match', () => {
    const hash = 'abc123'
    const ts = 1_700_000_000_000
    expect(
      classifyCardSync(makeLocal(ts, hash), makeRemote(ts, hash))
    ).toBe('IN_SYNC')
  })

  it('returns LOCAL_NEWER when local timestamp is greater', () => {
    expect(
      classifyCardSync(makeLocal(2000), makeRemote(1000))
    ).toBe('LOCAL_NEWER')
  })

  it('returns REMOTE_NEWER when remote timestamp is greater', () => {
    expect(
      classifyCardSync(makeLocal(1000), makeRemote(2000))
    ).toBe('REMOTE_NEWER')
  })

  it('returns LOCAL_NEWER when timestamps are equal but hashes differ', () => {
    const ts = 1_700_000_000_000
    expect(
      classifyCardSync(makeLocal(ts, 'hash-a'), makeRemote(ts, 'hash-b'))
    ).toBe('LOCAL_NEWER')
  })

  it('returns IN_SYNC only when both timestamp and hash match', () => {
    const ts = 1_700_000_000_000
    expect(
      classifyCardSync(makeLocal(ts, 'same'), makeRemote(ts, 'same'))
    ).toBe('IN_SYNC')
  })
})

describe('resolveCardConflict', () => {
  const makeLocal = (updatedAt, hash = 'h') => ({ updatedAt, content_hash: hash })
  const makeRemote = (updatedAt, hash = 'h') => ({
    updated_at: new Date(updatedAt).toISOString(),
    content_hash: hash,
  })

  it('LOCAL_ONLY → PUSH_LOCAL, winner local', () => {
    const result = resolveCardConflict(makeLocal(1000), null)
    expect(result).toEqual({ action: 'PUSH_LOCAL', winner: 'local' })
  })

  it('REMOTE_ONLY → PULL_REMOTE, winner remote', () => {
    const result = resolveCardConflict(null, makeRemote(1000))
    expect(result).toEqual({ action: 'PULL_REMOTE', winner: 'remote' })
  })

  it('IN_SYNC → NOOP, winner null', () => {
    const ts = 1_000
    const result = resolveCardConflict(makeLocal(ts, 'same'), makeRemote(ts, 'same'))
    expect(result).toEqual({ action: 'NOOP', winner: null })
  })

  it('LOCAL_NEWER → PUSH_LOCAL, winner local', () => {
    const result = resolveCardConflict(makeLocal(2000), makeRemote(1000))
    expect(result).toEqual({ action: 'PUSH_LOCAL', winner: 'local' })
  })

  it('REMOTE_NEWER → PULL_REMOTE (current policy), winner remote', () => {
    const result = resolveCardConflict(makeLocal(1000), makeRemote(2000))
    // TODO: will become PROMPT in a later conflict-UI slice
    expect(result).toEqual({ action: 'PULL_REMOTE', winner: 'remote' })
  })
})
