import { useCallback, useEffect, useState } from 'react'
import { loadCards, saveCards } from '../card/cardStorage'
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
import { loadTabCards, loadTabs, saveTabCards, saveTabs } from './tabStorage'

function initState() {
  const tabs = loadTabs()
  const tabCards = loadTabCards()
  const cards = loadCards()

  if (tabs.length === 0) {
    const defaultTab = createTab({ name: 'Main', order: 0 })
    saveTabs([defaultTab])
    return { tab: defaultTab, tabCards: [], cardsById: {} }
  }

  const tab = tabs[0]
  const cardsById = Object.fromEntries(cards.map((c) => [c.id, c]))
  return { tab, tabCards, cardsById }
}

export function useTabs() {
  const [state, setState] = useState(initState)

  useEffect(() => {
    saveTabs([state.tab])
  }, [state.tab])

  useEffect(() => {
    saveTabCards(state.tabCards)
  }, [state.tabCards])

  useEffect(() => {
    saveCards(Object.values(state.cardsById))
  }, [state.cardsById])

  const addCard = useCallback(({ title = '', body = '' } = {}) => {
    const card = createCard({ title, body })
    setState((prev) => {
      const position = nextPosition(prev.tabCards)
      const tc = createTabCard({ tabId: prev.tab.id, cardId: card.id, position })
      return {
        ...prev,
        tabCards: [...prev.tabCards, tc],
        cardsById: { ...prev.cardsById, [card.id]: card },
      }
    })
    return card
  }, [])

  const reorder = useCallback((cardId, toPosition) => {
    setState((prev) => ({
      ...prev,
      tabCards: reorderTabCard(prev.tabCards, cardId, toPosition),
    }))
  }, [])

  const fold = useCallback((cardId) => {
    setState((prev) => ({
      ...prev,
      tabCards: setTabCardFold(prev.tabCards, cardId, true),
    }))
  }, [])

  const unfold = useCallback((cardId) => {
    setState((prev) => ({
      ...prev,
      tabCards: setTabCardFold(prev.tabCards, cardId, false),
    }))
  }, [])

  const hide = useCallback((cardId) => {
    setState((prev) => ({
      ...prev,
      tabCards: setTabCardHidden(prev.tabCards, cardId, true),
    }))
  }, [])

  const unhide = useCallback((cardId) => {
    setState((prev) => ({
      ...prev,
      tabCards: setTabCardHidden(prev.tabCards, cardId, false),
    }))
  }, [])

  const removeCard = useCallback((cardId) => {
    setState((prev) => {
      const { [cardId]: _removed, ...rest } = prev.cardsById
      return {
        ...prev,
        tabCards: removeTabCard(prev.tabCards, cardId),
        cardsById: rest,
      }
    })
  }, [])

  const updateCard = useCallback((cardId, fields) => {
    setState((prev) => {
      const card = prev.cardsById[cardId]
      if (!card) return prev
      return {
        ...prev,
        cardsById: { ...prev.cardsById, [cardId]: updateCardFields(card, fields) },
      }
    })
  }, [])

  const entries = state.tabCards
    .filter((tc) => tc.tabId === state.tab.id)
    .sort((a, b) => a.position - b.position)
    .map((tc) => ({
      card: state.cardsById[tc.cardId],
      position: tc.position,
      foldState: tc.foldState,
      hiddenState: tc.hiddenState,
    }))
    .filter((entry) => entry.card !== undefined)

  return { tab: state.tab, entries, addCard, updateCard, removeCard, reorder, fold, unfold, hide, unhide }
}
