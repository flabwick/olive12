export const DOCK_STATE = {
  BASE: 'base',
  DOCK_EDITOR: 'dock_editor',
  TAB_EDITOR: 'tab_editor',
}

export function computeDockState({ activeDockCardId, activeEditorCardId, activeSurface }) {
  if (activeEditorCardId && activeSurface === 'dock') return DOCK_STATE.DOCK_EDITOR
  if (activeEditorCardId) return DOCK_STATE.TAB_EDITOR
  if (activeDockCardId) return DOCK_STATE.DOCK_EDITOR
  return DOCK_STATE.BASE
}

export function openDockCard(state, cardId) {
  return { ...state, activeDockCardId: cardId }
}

export function closeDockCard(state) {
  return { ...state, activeDockCardId: null }
}

export function setEditorCard(state, cardId) {
  return { ...state, activeEditorCardId: cardId }
}

export function clearEditorCard(state) {
  return { ...state, activeEditorCardId: null }
}
