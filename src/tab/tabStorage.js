const TABS_KEY = 'olive12:tabs'
const TAB_CARDS_KEY = 'olive12:tab_cards'

export function loadTabs() {
  const raw = localStorage.getItem(TABS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTabs(tabs) {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
}

export function loadTabCards() {
  const raw = localStorage.getItem(TAB_CARDS_KEY)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTabCards(tabCards) {
  localStorage.setItem(TAB_CARDS_KEY, JSON.stringify(tabCards))
}
