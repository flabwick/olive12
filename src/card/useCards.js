import { useCallback, useEffect, useState } from 'react'
import { createCard } from './createCard'
import { loadCards, saveCards } from './cardStorage'

export function useCards() {
  const [cards, setCards] = useState(() => loadCards())

  useEffect(() => {
    saveCards(cards)
  }, [cards])

  const addCard = useCallback(({ title = '', body = '' } = {}) => {
    const card = createCard({ title, body })
    setCards((current) => [...current, card])
    return card
  }, [])

  return { cards, addCard }
}
