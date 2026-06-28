import { useCallback, useEffect, useState } from 'react'
import { putCard } from '../card/cardStorage'
import { createCard } from '../card/createCard'
import { computeDockState } from './dockStateMachine'
import { addDockCard, getDockCardIds, removeDockCard } from './dockCardStorage'
import { getAllTabCards } from './tabStorage'

export function useDock({ cardsById = {}, activeEditorCardId = null, activeSurface = null, selectedCardCount = 0, moveCardId = null } = {}) {
  const [dockCardIds, setDockCardIds] = useState([])
  const [activeDockCardId, setActiveDockCardId] = useState(null)

  useEffect(() => {
    getDockCardIds().then(setDockCardIds)
  }, [])

  const dockCardEntries = dockCardIds
    .map((id) => ({ cardId: id, card: cardsById[id] }))
    .filter((e) => e.card !== undefined)

  const dockState = computeDockState({ activeDockCardId, activeEditorCardId, activeSurface, selectedCardCount, moveCardId })

  const openDockCard = useCallback((cardId) => {
    setActiveDockCardId((prev) => (prev === cardId ? null : cardId))
  }, [])

  const closeDockCard = useCallback(() => {
    setActiveDockCardId(null)
  }, [])

  const addToDock = useCallback(async (cardId) => {
    await addDockCard(cardId)
    setDockCardIds(await getDockCardIds())
  }, [])

  const removeFromDock = useCallback(async (cardId) => {
    await removeDockCard(cardId)
    setDockCardIds(await getDockCardIds())
    setActiveDockCardId((prev) => (prev === cardId ? null : prev))
  }, [])

  const createAndPinCard = useCallback(async (onCreated) => {
    const card = createCard({ title: '', body: '' })
    await putCard(card)
    await addDockCard(card.id)
    setDockCardIds(await getDockCardIds())
    setActiveDockCardId(card.id)
    onCreated?.(card)
  }, [])

  const moveDockCardToTab = useCallback(async (cardId, addTabCard) => {
    const allTabCards = await getAllTabCards()
    const alreadyInTab = allTabCards.some((tc) => tc.cardId === cardId)
    if (!alreadyInTab) {
      await addTabCard(cardId)
    }
    await removeDockCard(cardId)
    setDockCardIds(await getDockCardIds())
    setActiveDockCardId((prev) => (prev === cardId ? null : prev))
  }, [])

  return {
    dockCardIds,
    dockCardEntries,
    activeDockCardId,
    dockState,
    openDockCard,
    closeDockCard,
    addToDock,
    removeFromDock,
    createAndPinCard,
    moveDockCardToTab,
  }
}
