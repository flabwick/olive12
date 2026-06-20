import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearIndexDebugEvents,
  getEventsForCard,
  getLastErrorForCard,
  logIndexEvent,
  subscribeIndexDebug,
} from './indexPipelineDebug'

describe('indexPipelineDebug', () => {
  afterEach(() => {
    clearIndexDebugEvents()
  })

  it('logIndexEvent appends events retrievable by cardId', () => {
    logIndexEvent({ stage: 'moveToLibrary', cardId: 'c1', status: 'start' })
    logIndexEvent({ stage: 'wiki-index:invoke', cardId: 'c1', status: 'ok', detail: { title: 'T' } })

    expect(getEventsForCard('c1')).toHaveLength(2)
    expect(getEventsForCard('other')).toHaveLength(0)
  })

  it('getLastErrorForCard returns the most recent error', () => {
    logIndexEvent({ stage: 'wiki-index:invoke', cardId: 'c1', status: 'ok' })
    logIndexEvent({ stage: 'wiki-index:response', cardId: 'c1', status: 'error', error: '502 bad gateway' })

    expect(getLastErrorForCard('c1')?.error).toBe('502 bad gateway')
  })

  it('subscribeIndexDebug notifies on new events', () => {
    const fn = vi.fn()
    const unsub = subscribeIndexDebug(fn)
    expect(fn).toHaveBeenCalledTimes(1)

    logIndexEvent({ stage: 'flip', cardId: 'c1' })
    expect(fn).toHaveBeenCalledTimes(2)

    unsub()
    logIndexEvent({ stage: 'flip', cardId: 'c2' })
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
