import { describe, expect, it } from 'vitest'
import {
  clearEditorCard,
  closeDockCard,
  computeDockState,
  DOCK_STATE,
  openDockCard,
  setEditorCard,
} from './dockStateMachine'

describe('computeDockState', () => {
  it('returns BASE when no ids are set', () => {
    expect(computeDockState({ activeDockCardId: null, activeEditorCardId: null })).toBe(DOCK_STATE.BASE)
  })

  it('returns BASE when only activeDockCardId is set (no active editor)', () => {
    expect(computeDockState({ activeDockCardId: 'card-1', activeEditorCardId: null })).toBe(DOCK_STATE.BASE)
  })

  it('returns TAB_EDITOR when only activeEditorCardId is set', () => {
    expect(computeDockState({ activeDockCardId: null, activeEditorCardId: 'card-1' })).toBe(DOCK_STATE.TAB_EDITOR)
  })

  it('returns TAB_EDITOR when both ids are set without dock surface', () => {
    expect(computeDockState({ activeDockCardId: 'card-1', activeEditorCardId: 'card-2' })).toBe(DOCK_STATE.TAB_EDITOR)
  })

  it('returns DOCK_EDITOR when editing the active dock card (activeSurface=dock)', () => {
    expect(computeDockState({ activeDockCardId: 'card-1', activeEditorCardId: 'card-1', activeSurface: 'dock' })).toBe(DOCK_STATE.DOCK_EDITOR)
  })

  it('returns TAB_EDITOR when editing a tab surface even if ids match', () => {
    expect(computeDockState({ activeDockCardId: 'card-1', activeEditorCardId: 'card-1', activeSurface: 'tab' })).toBe(DOCK_STATE.TAB_EDITOR)
  })

  it('treats empty string ids as falsy and returns BASE', () => {
    expect(computeDockState({ activeDockCardId: '', activeEditorCardId: '' })).toBe(DOCK_STATE.BASE)
  })
})

describe('openDockCard', () => {
  it('sets activeDockCardId on the returned state', () => {
    const state = { activeDockCardId: null, activeEditorCardId: null }
    const next = openDockCard(state, 'card-1')
    expect(next.activeDockCardId).toBe('card-1')
  })

  it('does not mutate the input state', () => {
    const state = { activeDockCardId: null, activeEditorCardId: null }
    openDockCard(state, 'card-1')
    expect(state.activeDockCardId).toBeNull()
  })
})

describe('closeDockCard', () => {
  it('clears activeDockCardId on the returned state', () => {
    const state = { activeDockCardId: 'card-1', activeEditorCardId: null }
    const next = closeDockCard(state)
    expect(next.activeDockCardId).toBeNull()
  })

  it('does not mutate the input state', () => {
    const state = { activeDockCardId: 'card-1', activeEditorCardId: null }
    closeDockCard(state)
    expect(state.activeDockCardId).toBe('card-1')
  })
})

describe('setEditorCard', () => {
  it('sets activeEditorCardId on the returned state', () => {
    const state = { activeDockCardId: null, activeEditorCardId: null }
    const next = setEditorCard(state, 'card-2')
    expect(next.activeEditorCardId).toBe('card-2')
  })

  it('does not mutate the input state', () => {
    const state = { activeDockCardId: null, activeEditorCardId: null }
    setEditorCard(state, 'card-2')
    expect(state.activeEditorCardId).toBeNull()
  })
})

describe('clearEditorCard', () => {
  it('clears activeEditorCardId on the returned state', () => {
    const state = { activeDockCardId: null, activeEditorCardId: 'card-2' }
    const next = clearEditorCard(state)
    expect(next.activeEditorCardId).toBeNull()
  })

  it('does not mutate the input state', () => {
    const state = { activeDockCardId: null, activeEditorCardId: 'card-2' }
    clearEditorCard(state)
    expect(state.activeEditorCardId).toBe('card-2')
  })
})
