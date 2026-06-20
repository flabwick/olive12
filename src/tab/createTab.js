export function createTab({ name = '', order = 0 } = {}) {
  return {
    id: crypto.randomUUID(),
    name,
    kind: 'blank',
    order,
    savedLocation: 'none',
    savedFolderId: null,
    isOpen: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

export function updateTabFields(tab, fields) {
  return { ...tab, ...fields, updatedAt: Date.now() }
}

export function setTabName(tabs, tabId, name) {
  return tabs.map((t) => (t.id === tabId ? updateTabFields(t, { name }) : t))
}

export function removeTab(tabs, tabId) {
  return tabs
    .filter((t) => t.id !== tabId)
    .map((t, i) => ({ ...t, order: i }))
}

export function reorderTabs(tabs, tabId, toIndex) {
  const clamped = Math.max(0, Math.min(toIndex, tabs.length - 1))
  const from = tabs.findIndex((t) => t.id === tabId)
  if (from === -1 || from === clamped) return tabs
  const moved = tabs[from]
  const without = tabs.filter((_, i) => i !== from)
  const result = [...without.slice(0, clamped), moved, ...without.slice(clamped)]
  return result.map((t, i) => ({ ...t, order: i }))
}

export function saveTabToShelf(tab) {
  return updateTabFields(tab, { savedLocation: 'shelf' })
}

export function moveTabToLibrary(tab, folderId = null) {
  return updateTabFields(tab, { savedLocation: 'library', savedFolderId: folderId })
}

/** Tabs without `isOpen` (legacy records) are treated as open. */
export function isTabOpen(tab) {
  return tab?.isOpen !== false
}

export function closeSavedTab(tab) {
  return updateTabFields(tab, { isOpen: false })
}

export function reopenTab(tab) {
  return updateTabFields(tab, { isOpen: true })
}

export function createTabCard({ tabId, cardId, position }) {
  return { tabId, cardId, position, foldState: false, hiddenState: false }
}

export function nextPosition(tabCards) {
  return tabCards.length
}

export function reorderTabCard(tabCards, cardId, toPosition) {
  const clamped = Math.max(0, Math.min(toPosition, tabCards.length - 1))
  const from = tabCards.findIndex((tc) => tc.cardId === cardId)
  if (from === -1 || from === clamped) return tabCards

  const moved = tabCards[from]
  const without = tabCards.filter((_, i) => i !== from)
  const result = [...without.slice(0, clamped), moved, ...without.slice(clamped)]
  return result.map((tc, i) => ({ ...tc, position: i }))
}

export function setTabCardFold(tabCards, cardId, foldState) {
  return tabCards.map((tc) => (tc.cardId === cardId ? { ...tc, foldState } : tc))
}

export function setTabCardHidden(tabCards, cardId, hiddenState) {
  return tabCards.map((tc) => (tc.cardId === cardId ? { ...tc, hiddenState } : tc))
}

export function removeTabCard(tabCards, cardId) {
  return tabCards
    .filter((tc) => tc.cardId !== cardId)
    .map((tc, i) => ({ ...tc, position: i }))
}
