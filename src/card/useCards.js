import { useCallback, useEffect, useState } from 'react'
import { createCard } from './createCard'
import { getAllCards, putCard } from './cardStorage'

export function useCards() {
  const [cards, setCards] = useState([])

  useEffect(() => {
    getAllCards().then(setCards)
  }, [])

  const addCard = useCallback(async ({ title = '', body = '' } = {}) => {
    const card = createCard({ title, body })
    await putCard(card)
    setCards((current) => [...current, card])
    return card
  }, [])

  return { cards, addCard }
}
