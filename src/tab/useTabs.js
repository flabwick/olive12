import { useCallback, useEffect, useRef, useState } from 'react'
import { deleteCard, getAllCards, putCard } from '../card/cardStorage'
import { createCard, updateCardFields } from '../card/createCard'
import { createFolder as makeFolderObject } from '../folder/createFolder'
import { getAllFolders, putFolder } from '../folder/folderStorage'
import { supabase } from '../lib/supabaseClient'
import { assembleContext } from '../prompt/assembleContext'
import { createCardSyncScheduler } from '../sync/cardSync'
import { makeCardSupabaseStorage } from '../sync/cardSupabaseStorage'
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

export function useTabs({ userId } = {}) {
  const [isReady, setIsReady] = useState(false)
  const [tab, setTab] = useState(null)
  const [tabCards, setTabCards] = useState([])
  const [cardsById, setCardsById] = useState({})
  const [folders, setFolders] = useState([])
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState('')
  const schedulerRef = useRef(null)
  const storageRef = useRef(null)

  useEffect(() => {
    if (!userId) {
      schedulerRef.current = null
      storageRef.current = null
      return
    }
    const storage = makeCardSupabaseStorage(supabase)
    storageRef.current = storage
    schedulerRef.current = createCardSyncScheduler({ userId, debounceMs: 3000, storage })
  }, [userId])

  useEffect(() => {
    if (!isReady || !userId || !schedulerRef.current) return

    schedulerRef.current.runNow().then(async () => {
      // Reload cards from Dexie — may include remote cards pulled by runNow
      const [freshCards, allTabCards, allTabs] = await Promise.all([
        getAllCards(),
        getAllTabCards(),
        getAllTabs(),
      ])

      const freshById = Object.fromEntries(freshCards.map((c) => [c.id, c]))
      const activeTab = allTabs[0]

      // Any card in Dexie that has no tab_card entry is new to this device —
      // place it at the end of the active tab so it appears in the feed.
      if (activeTab) {
        const knownIds = new Set(allTabCards.map((tc) => tc.cardId))
        const orphans = freshCards.filter((c) => !knownIds.has(c.id))

        if (orphans.length > 0) {
          const maxPos = allTabCards.reduce((m, tc) => Math.max(m, tc.position), -1)
          const newTabCards = []
          let pos = maxPos + 1
          for (const card of orphans) {
            const tc = createTabCard({ tabId: activeTab.id, cardId: card.id, position: pos++ })
            newTabCards.push(tc)
            await putTabCard(tc)
          }
          setTabCards((prev) => [...prev, ...newTabCards])
        }
      }

      setCardsById(freshById)
    })
  }, [isReady, userId])

  useEffect(() => {
    let active = true

    async function init() {
      const [tabs, tcs, cards, fds] = await Promise.all([
        getAllTabs(), getAllTabCards(), getAllCards(), getAllFolders(),
      ])
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

      setFolders(fds)
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
      schedulerRef.current?.scheduleSync()
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
      schedulerRef.current?.scheduleSync()
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
        ...(storageRef.current ? [storageRef.current.deleteRemoteCard(cardId)] : []),
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

  const saveToShelf = useCallback(
    async (cardId) => {
      const card = cardsById[cardId]
      if (!card) return
      const updated = updateCardFields(card, { location: 'shelf' })
      setCardsById((prev) => ({ ...prev, [cardId]: updated }))
      await putCard(updated)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById],
  )

  const moveToLibrary = useCallback(
    async (cardId, folderId = null) => {
      const card = cardsById[cardId]
      if (!card) return
      const updated = updateCardFields(card, { location: 'library', folderId })
      setCardsById((prev) => ({ ...prev, [cardId]: updated }))
      await putCard(updated)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById],
  )

  const createFolder = useCallback(async ({ name = 'New folder', parentId = null } = {}) => {
    const folder = makeFolderObject({ name, parentId })
    setFolders((prev) => [...prev, folder])
    await putFolder(folder)
    return folder
  }, [])

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

  const shelfEntries = Object.values(cardsById)
    .filter((c) => c.location === 'shelf')
    .sort((a, b) => a.createdAt - b.createdAt)

  const libraryEntries = Object.values(cardsById)
    .filter((c) => c.location === 'library')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const runDockPrompt = useCallback(
    async (promptText) => {
      console.log('[useTabs] runDockPrompt called, prompt:', JSON.stringify(promptText))
      setPromptLoading(true)
      setPromptError('')
      try {
        const contextCards = assembleContext(entries)
        console.log('[useTabs] contextCards:', JSON.stringify(contextCards))
        console.log('[useTabs] invoking dock-prompt edge function...')
        const { data, error } = await supabase.functions.invoke('dock-prompt', {
          body: { prompt: promptText, contextCards },
        })
        console.log('[useTabs] invoke complete')
        console.log('[useTabs] raw data:', JSON.stringify(data))
        console.log('[useTabs] _debug from server:', JSON.stringify(data?._debug))
        console.log('[useTabs] raw error:', JSON.stringify(error))
        if (error) {
          console.error('[useTabs] invoke returned an error, throwing')
          throw error
        }
        const title = data?.title ?? ''
        const body = data?.body ?? ''
        console.log('[useTabs] title to addCard:', JSON.stringify(title))
        console.log('[useTabs] body to addCard:', JSON.stringify(body))
        const card = await addCard({ title, body })
        console.log('[useTabs] addCard result:', JSON.stringify(card))
        setPromptLoading(false)
        return true
      } catch (err) {
        console.error('[useTabs] caught error:', err)
        setPromptError(err.message || 'Something went wrong')
        setPromptLoading(false)
        return false
      }
    },
    [entries, addCard],
  )

  return { tab, isReady, entries, shelfEntries, libraryEntries, folders, addCard, updateCard, removeCard, reorder, fold, unfold, hide, unhide, saveToShelf, moveToLibrary, createFolder, runDockPrompt, promptLoading, promptError }
}
