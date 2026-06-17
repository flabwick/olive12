import { useCallback, useEffect, useState } from 'react'
import { deleteCard, getAllCards, putCard } from '../card/cardStorage'
import { createCard, updateCardFields } from '../card/createCard'
import {
  createTab,
  createTabCard,
  nextPosition,
  removeTabCard,
  reorderTabCard,
  setTabCardFold,
  setTabCardHidden,
} from './createTab'
import { deleteTabCard, getAllTabCards, getAllTabs, putTab, putTabCard } from './tabStorage'

export function useTabs() {
  const [isReady, setIsReady] = useState(false)
  const [tab, setTab] = useState(null)
  const [tabCards, setTabCards] = useState([])
  const [cardsById, setCardsById] = useState({})

  useEffect(() => {
    let active = true

    async function init() {
      const [tabs, tcs, cards] = await Promise.all([getAllTabs(), getAllTabCards(), getAllCards()])
      if (!active) return

      if (tabs.length === 0) {
        const defaultTab = createTab({ name: 'Main', order: 0 })
        await putTab(defaultTab)
        if (!active) return
        setTab(defaultTab)
        setTabCards([])
        setCardsById({})
      } else {
        setTab(tabs[0])
        setTabCards(tcs)
        setCardsById(Object.fromEntries(cards.map((c) => [c.id, c])))
      }

      setIsReady(true)
    }

    init()
    return () => {
      active = false
    }
  }, [])

  const addCard = useCallback(
    async ({ title = '', body = '' } = {}) => {
      if (!tab) return
      const card = createCard({ title, body })
      const position = nextPosition(tabCards)
      const tc = createTabCard({ tabId: tab.id, cardId: card.id, position })
      setTabCards((prev) => [...prev, tc])
      setCardsById((prev) => ({ ...prev, [card.id]: card }))
      await Promise.all([putCard(card), putTabCard(tc)])
      return card
    },
    [tab, tabCards],
  )

  const updateCard = useCallback(
    async (cardId, fields) => {
      const card = cardsById[cardId]
      if (!card) return
      const updated = updateCardFields(card, fields)
      setCardsById((prev) => ({ ...prev, [cardId]: updated }))
      await putCard(updated)
    },
    [cardsById],
  )

  const removeCard = useCallback(
    async (cardId) => {
      const tc = tabCards.find((t) => t.cardId === cardId)
      const nextTabCards = removeTabCard(tabCards, cardId)
      const { [cardId]: _, ...rest } = cardsById
      setTabCards(nextTabCards)
      setCardsById(rest)
      await Promise.all([
        deleteCard(cardId),
        ...(tc ? [deleteTabCard(tc.tabId, cardId)] : []),
        ...nextTabCards.map((t) => putTabCard(t)),
      ])
    },
    [tabCards, cardsById],
  )

  const reorder = useCallback(
    async (cardId, toPosition) => {
      const nextTabCards = reorderTabCard(tabCards, cardId, toPosition)
      setTabCards(nextTabCards)
      await Promise.all(nextTabCards.map((t) => putTabCard(t)))
    },
    [tabCards],
  )

  const fold = useCallback(
    async (cardId) => {
      const nextTabCards = setTabCardFold(tabCards, cardId, true)
      setTabCards(nextTabCards)
      const changed = nextTabCards.find((t) => t.cardId === cardId)
      if (changed) await putTabCard(changed)
    },
    [tabCards],
  )

  const unfold = useCallback(
    async (cardId) => {
      const nextTabCards = setTabCardFold(tabCards, cardId, false)
      setTabCards(nextTabCards)
      const changed = nextTabCards.find((t) => t.cardId === cardId)
      if (changed) await putTabCard(changed)
    },
    [tabCards],
  )

  const hide = useCallback(
    async (cardId) => {
      const nextTabCards = setTabCardHidden(tabCards, cardId, true)
      setTabCards(nextTabCards)
      const changed = nextTabCards.find((t) => t.cardId === cardId)
      if (changed) await putTabCard(changed)
    },
    [tabCards],
  )

  const unhide = useCallback(
    async (cardId) => {
      const nextTabCards = setTabCardHidden(tabCards, cardId, false)
      setTabCards(nextTabCards)
      const changed = nextTabCards.find((t) => t.cardId === cardId)
      if (changed) await putTabCard(changed)
    },
    [tabCards],
  )

  const entries = tabCards
    .filter((tc) => tc.tabId === tab?.id)
    .sort((a, b) => a.position - b.position)
    .map((tc) => ({
      card: cardsById[tc.cardId],
      position: tc.position,
      foldState: tc.foldState,
      hiddenState: tc.hiddenState,
    }))
    .filter((entry) => entry.card !== undefined)

  return { tab, isReady, entries, addCard, updateCard, removeCard, reorder, fold, unfold, hide, unhide }
}
