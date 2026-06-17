const STORAGE_KEY = 'olive12:cards'

export function loadCards() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCards(cards) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}
