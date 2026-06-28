export const DOCK_STATE = {
  BASE: 'base',
  DOCK_EDITOR: 'dock_editor',
  TAB_EDITOR: 'tab_editor',
  CARD_SELECTED: 'card_selected',
  CARD_MOVE: 'card_move',
}

export function computeDockState({
  activeDockCardId,
  activeEditorCardId,
  activeSurface,
  selectedCardCount = 0,
  moveCardId = null,
}) {
  if (activeEditorCardId && activeSurface === 'dock') return DOCK_STATE.DOCK_EDITOR
  if (activeEditorCardId) return DOCK_STATE.TAB_EDITOR
  if (moveCardId) return DOCK_STATE.CARD_MOVE
  if (selectedCardCount > 0) return DOCK_STATE.CARD_SELECTED
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
