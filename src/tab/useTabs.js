import { useCallback, useEffect, useRef, useState } from 'react'
import { isFlipped as isFlippedFn, toggleFlip } from '../card/flipLogic'
import { parseStreamChunk } from '../prompt/streamParser'
import { deleteCard, getAllCards, putCard } from '../card/cardStorage'
import { deleteLinksForSource, rebuildLinksForCard } from '../card/linkStorage'
import { createCard, updateCardFields } from '../card/createCard'
import { createFolder as makeFolderObject } from '../folder/createFolder'
import { getAllFolders, putFolder } from '../folder/folderStorage'
import { supabase } from '../lib/supabaseClient'
import { assembleContext } from '../prompt/assembleContext'
import { createCardSyncScheduler } from '../sync/cardSync'
import { makeCardSupabaseStorage } from '../sync/cardSupabaseStorage'
import { computeContentHash } from '../sync/cardSyncLogic'
import { getBrainFeedItems } from '../brain/brainFeedLogic'
import { createIndexEntry } from '../brain/createIndexEntry'
import { getAllIndexEntries, putIndexEntry } from '../brain/indexEntryStorage'
import { db } from '../db/vaultDb'
import {
  createTab,
  createTabCard,
  moveTabToLibrary as moveTabToLibraryPure,
  nextPosition,
  removeTab as removeTabPure,
  removeTabCard,
  reorderTabCard,
  saveTabToShelf as saveTabToShelfPure,
  setTabCardFold,
  setTabCardHidden,
  setTabName as setTabNamePure,
} from './createTab'
import {
  deleteAllTabCards,
  deleteTab as deleteTabStorage,
  deleteTabCard,
  getAllTabCards,
  getAllTabs,
  putTab,
  putTabCard,
} from './tabStorage'

const ACTIVE_TAB_KEY = 'olive12:activeTabId'

export function useTabs({ userId } = {}) {
  const [isReady, setIsReady] = useState(false)
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [tabCards, setTabCards] = useState([])
  const [cardsById, setCardsById] = useState({})
  const [folders, setFolders] = useState([])
  const [indexEntries, setIndexEntries] = useState([])
  const [allLinks, setAllLinks] = useState([])
  const [flippedCardIds, setFlippedCardIds] = useState(() => new Set())
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
      const [freshCards, allTabCards, allTabs] = await Promise.all([
        getAllCards(),
        getAllTabCards(),
        getAllTabs(),
      ])

      const freshById = Object.fromEntries(freshCards.map((c) => [c.id, c]))
      const sortedTabs = [...allTabs].sort((a, b) => a.order - b.order)
      const activeTab = sortedTabs[0]

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
      const [storedTabs, tcs, cards, fds, entries, links] = await Promise.all([
        getAllTabs(), getAllTabCards(), getAllCards(), getAllFolders(),
        getAllIndexEntries(), db.links.toArray(),
      ])
      if (!active) return

      const sortedTabs = [...storedTabs]
        .sort((a, b) => a.order - b.order)
        .map((t) => ({
          savedLocation: 'none',
          savedFolderId: null,
          ...t,
        }))

      if (sortedTabs.length === 0) {
        const defaultTab = createTab({ name: 'Main', order: 0 })
        await putTab(defaultTab)
        if (!active) return
        setTabs([defaultTab])
        setActiveTabId(defaultTab.id)
        setTabCards([])
        setCardsById({})
      } else {
        const savedId = localStorage.getItem(ACTIVE_TAB_KEY)
        const restoredId = savedId && sortedTabs.find((t) => t.id === savedId)
          ? savedId
          : sortedTabs[0].id
        setTabs(sortedTabs)
        setActiveTabId(restoredId)
        setTabCards(tcs)
        setCardsById(Object.fromEntries(cards.map((c) => [c.id, c])))
      }

      setFolders(fds)
      setIndexEntries(entries)
      setAllLinks(links)
      setIsReady(true)
    }

    init()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (activeTabId) localStorage.setItem(ACTIVE_TAB_KEY, activeTabId)
  }, [activeTabId])

  const switchTab = useCallback((tabId) => {
    setActiveTabId(tabId)
  }, [])

  const addTab = useCallback(async () => {
    const newTab = createTab({ name: 'New tab', order: tabs.length })
    await putTab(newTab)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [tabs])

  const removeTab = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)

    // Saved tabs (shelf/library) are kept in storage so the vault still shows them.
    // Just switch the active tab away from it without deleting anything.
    if (tab?.savedLocation !== 'none') {
      if (activeTabId === tabId) {
        const other = tabs.find((t) => t.id !== tabId && t.savedLocation === 'none')
        if (other) {
          setActiveTabId(other.id)
        } else {
          const defaultTab = createTab({ name: 'Main', order: tabs.length })
          await putTab(defaultTab)
          setTabs((prev) => [...prev, defaultTab])
          setActiveTabId(defaultTab.id)
        }
      }
      return
    }

    await deleteAllTabCards(tabId)
    await deleteTabStorage(tabId)

    const nextTabs = removeTabPure(tabs, tabId)

    if (nextTabs.length === 0) {
      const defaultTab = createTab({ name: 'Main', order: 0 })
      await putTab(defaultTab)
      setTabs([defaultTab])
      setActiveTabId(defaultTab.id)
    } else {
      let nextActiveId = activeTabId
      if (activeTabId === tabId) {
        const removedIndex = tabs.findIndex((t) => t.id === tabId)
        const adjacent = nextTabs[removedIndex] ?? nextTabs[removedIndex - 1] ?? nextTabs[0]
        nextActiveId = adjacent.id
      }
      setTabs(nextTabs)
      setActiveTabId(nextActiveId)
    }

    setTabCards((prev) => prev.filter((tc) => tc.tabId !== tabId))
  }, [tabs, activeTabId])

  const renameTab = useCallback(async (tabId, name) => {
    const nextTabs = setTabNamePure(tabs, tabId, name)
    const updated = nextTabs.find((t) => t.id === tabId)
    if (updated) await putTab(updated)
    setTabs(nextTabs)
  }, [tabs])

  const saveTabToShelf = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = saveTabToShelfPure(tab)
    await putTab(updated)
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
  }, [tabs])

  const moveTabToLibrary = useCallback(async (tabId, folderId = null) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = moveTabToLibraryPure(tab, folderId)
    await putTab(updated)
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
  }, [tabs])

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null

  const reloadLinks = useCallback(async () => {
    setAllLinks(await db.links.toArray())
  }, [])

  const reindexCard = useCallback(
    async (cardId, cardOverride) => {
      const card = cardOverride ?? cardsById[cardId]
      if (!card || card.location !== 'library') return

      try {
        const neighborEntries = (await getAllIndexEntries()).slice(0, 10)
        const { data, error } = await supabase.functions.invoke('wiki-index', {
          body: { card, neighborEntries },
        })
        if (!error && data) {
          const entry = createIndexEntry({
            cardId,
            title: data.title || card.title || '',
            tags: data.tags ?? [],
            summary: data.summary ?? '',
            links: data.links ?? [],
            contentHash: computeContentHash(card),
          })
          await putIndexEntry(entry)
          setIndexEntries((prev) => [...prev.filter((e) => e.cardId !== cardId), entry])
          if (userId) {
            await supabase.from('index_entries').upsert({
              card_id: cardId,
              user_id: userId,
              title: entry.title,
              tags: entry.tags,
              summary: entry.summary,
              links: entry.links,
              content_hash: entry.contentHash,
              updated_at: new Date(entry.updatedAt).toISOString(),
            })
          }
        }
      } catch (err) {
        console.error('[useTabs] wiki-index error:', err)
      }
    },
    [cardsById, userId],
  )

  const addCard = useCallback(
    async ({ title = '', body = '' } = {}) => {
      if (!activeTab) return
      const card = createCard({ title, body })
      const activeTabCards = tabCards.filter((tc) => tc.tabId === activeTab.id)
      const position = nextPosition(activeTabCards)
      const tc = createTabCard({ tabId: activeTab.id, cardId: card.id, position })
      setTabCards((prev) => [...prev, tc])
      setCardsById((prev) => ({ ...prev, [card.id]: card }))
      await Promise.all([putCard(card), putTabCard(tc)])
      await rebuildLinksForCard(card)
      await reloadLinks()
      schedulerRef.current?.scheduleSync()
      return card
    },
    [activeTab, tabCards, reloadLinks],
  )

  const addPortalCard = useCallback(
    async (targetCardId) => {
      if (!activeTab) return null
      const activeTabCards = tabCards.filter((tc) => tc.tabId === activeTab.id)
      const alreadyPresent = activeTabCards.some((tc) => {
        const c = cardsById[tc.cardId]
        if (!c) return false
        return c.id === targetCardId || (c.type === 'portal' && c.config?.target_card_id === targetCardId)
      })
      if (alreadyPresent) return null
      const card = createCard({ type: 'portal', config: { target_card_id: targetCardId } })
      const position = nextPosition(activeTabCards)
      const tc = createTabCard({ tabId: activeTab.id, cardId: card.id, position })
      setTabCards((prev) => [...prev, tc])
      setCardsById((prev) => ({ ...prev, [card.id]: card }))
      await Promise.all([putCard(card), putTabCard(tc)])
      await rebuildLinksForCard(card)
      await reloadLinks()
      schedulerRef.current?.scheduleSync()
      return card
    },
    [activeTab, tabCards, cardsById, reloadLinks],
  )

  const updateCard = useCallback(
    async (cardId, fields) => {
      const card = cardsById[cardId]
      if (!card) return
      const updated = updateCardFields(card, fields)
      setCardsById((prev) => ({ ...prev, [cardId]: updated }))
      await putCard(updated)
      await rebuildLinksForCard(updated)
      await reloadLinks()
      schedulerRef.current?.scheduleSync()
      if (updated.location === 'library') {
        void reindexCard(cardId, updated)
      }
    },
    [cardsById, reloadLinks, reindexCard],
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
        deleteLinksForSource(cardId),
        ...(tc ? [deleteTabCard(tc.tabId, cardId)] : []),
        ...nextTabCards.map((t) => putTabCard(t)),
        ...(storageRef.current ? [storageRef.current.deleteRemoteCard(cardId)] : []),
      ])
      await reloadLinks()
    },
    [tabCards, cardsById, reloadLinks],
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

      const matchingTabCards = tabCards.filter((tc) => tc.cardId === cardId)
      const portalCards = matchingTabCards.map(() =>
        createCard({ type: 'portal', config: { target_card_id: cardId } }),
      )
      const portalTabCards = matchingTabCards.map((tc, i) =>
        createTabCard({ tabId: tc.tabId, cardId: portalCards[i].id, position: tc.position }),
      )

      const newCardsById = { ...cardsById, [cardId]: updated }
      for (const pc of portalCards) newCardsById[pc.id] = pc

      setCardsById(newCardsById)
      setTabCards((prev) => [
        ...prev.filter((tc) => tc.cardId !== cardId),
        ...portalTabCards,
      ])

      await putCard(updated)
      await Promise.all([
        ...portalCards.map((pc) => putCard(pc)),
        ...portalTabCards.map((tc) => putTabCard(tc)),
        ...matchingTabCards.map((tc) => deleteTabCard(tc.tabId, cardId)),
      ])
      await Promise.all(portalCards.map((pc) => rebuildLinksForCard(pc)))
      await reloadLinks()
      schedulerRef.current?.scheduleSync()
    },
    [cardsById, tabCards, reloadLinks],
  )

  const moveToLibrary = useCallback(
    async (cardId, folderId = null) => {
      const card = cardsById[cardId]
      if (!card) return
      const updated = updateCardFields(card, { location: 'library', folderId })
      setCardsById((prev) => ({ ...prev, [cardId]: updated }))
      await putCard(updated)
      schedulerRef.current?.scheduleSync()
      await reindexCard(cardId, updated)
    },
    [cardsById, reindexCard],
  )

  const createFolder = useCallback(async ({ name = 'New folder', parentId = null } = {}) => {
    const folder = makeFolderObject({ name, parentId })
    setFolders((prev) => [...prev, folder])
    await putFolder(folder)
    return folder
  }, [])

  const flipCard = useCallback((cardId) => {
    setFlippedCardIds((prev) => toggleFlip(prev, cardId))
  }, [])

  const isFlippedCard = useCallback((cardId) => {
    return isFlippedFn(flippedCardIds, cardId)
  }, [flippedCardIds])

  const entries = tabCards
    .filter((tc) => tc.tabId === activeTabId)
    .sort((a, b) => a.position - b.position)
    .map((tc) => {
      const card = cardsById[tc.cardId]
      const lookupId = card?.type === 'portal'
        ? (card.config?.target_card_id ?? tc.cardId)
        : tc.cardId
      return {
        card,
        position: tc.position,
        foldState: tc.foldState,
        hiddenState: tc.hiddenState,
        indexEntry: indexEntries.find((e) => e.cardId === lookupId) ?? null,
      }
    })
    .filter((entry) => entry.card !== undefined)

  const shelfEntries = Object.values(cardsById)
    .filter((c) => c.location === 'shelf')
    .sort((a, b) => a.createdAt - b.createdAt)

  const libraryEntries = Object.values(cardsById)
    .filter((c) => c.location === 'library')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const brainFeedItems = getBrainFeedItems(cardsById, indexEntries, allLinks)

  const shelfTabs = tabs.filter((t) => t.savedLocation === 'shelf')
  const libraryTabs = tabs.filter((t) => t.savedLocation === 'library')

  const runDockPrompt = useCallback(
    async (promptText) => {
      setPromptLoading(true)
      setPromptError('')
      try {
        const contextCards = assembleContext(entries)

        // Create the card immediately so it appears in the tab before streaming starts.
        const initialCard = await addCard({ title: '', body: '' })
        const cardId = initialCard.id
        // Track the card locally to avoid stale cardsById closure during streaming.
        let currentCard = initialCard

        const applyUpdate = async (title, body) => {
          const updated = updateCardFields(currentCard, { title, body })
          currentCard = updated
          setCardsById((prev) => ({ ...prev, [cardId]: updated }))
          await putCard(updated)
          schedulerRef.current?.scheduleSync()
        }

        // Use raw fetch for streaming — supabase.functions.invoke may buffer the body.
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? ''
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? ''
        const sessionResult = await supabase.auth.getSession().catch(() => ({ data: { session: null } }))
        const authToken = sessionResult?.data?.session?.access_token ?? supabaseKey

        const fetchResponse = await fetch(`${supabaseUrl}/functions/v1/dock-prompt`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({ prompt: promptText, contextCards }),
        })

        if (!fetchResponse.ok) {
          const detail = await fetchResponse.text()
          throw new Error(`dock-prompt error: ${detail}`)
        }

        const reader = fetchResponse.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''
        let titleLine = ''
        let titleResolved = false
        let rafHandle = null

        const scheduleBodyUpdate = () => {
          if (rafHandle !== null) return
          rafHandle = requestAnimationFrame(async () => {
            rafHandle = null
            const nlIdx = accumulated.indexOf('\n')
            const body = accumulated.slice(nlIdx + 1).replace(/^\n+/, '').trimEnd()
            await applyUpdate(titleLine, body)
          })
        }

        let rawText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const text = decoder.decode(value, { stream: true })
          rawText += text

          for (const line of text.split('\n')) {
            const delta = parseStreamChunk(line.trim())
            if (delta !== null) accumulated += delta
          }

          if (!titleResolved) {
            const nlIdx = accumulated.indexOf('\n')
            if (nlIdx !== -1) {
              titleLine = accumulated.slice(0, nlIdx).trim() || 'Response'
              titleResolved = true
              const body = accumulated.slice(nlIdx + 1).replace(/^\n+/, '').trimEnd()
              await applyUpdate(titleLine, body)
            }
          } else {
            scheduleBodyUpdate()
          }
        }

        if (rafHandle !== null) {
          cancelAnimationFrame(rafHandle)
          rafHandle = null
        }

        // If no SSE deltas were parsed, try a JSON fallback (legacy function format).
        if (!accumulated.trim()) {
          try {
            const parsed = JSON.parse(rawText.trim())
            await applyUpdate((parsed.title || '').trim() || 'Response', (parsed.body || '').trim())
          } catch {
            await applyUpdate('Response', '')
          }
        } else if (!titleResolved) {
          await applyUpdate(accumulated.trim() || 'Response', '')
        } else {
          const nlIdx = accumulated.indexOf('\n')
          let bodyStart = nlIdx + 1
          while (bodyStart < accumulated.length && accumulated[bodyStart] === '\n') bodyStart++
          await applyUpdate(titleLine, accumulated.slice(bodyStart).trim())
        }

        setPromptLoading(false)
        return true
      } catch (err) {
        console.error('[useTabs] runDockPrompt error:', err)
        setPromptError(err.message || 'Something went wrong')
        setPromptLoading(false)
        return false
      }
    },
    [entries, addCard],
  )

  return {
    tab: activeTab,
    tabs,
    activeTabId,
    isReady,
    entries,
    shelfEntries,
    libraryEntries,
    shelfTabs,
    libraryTabs,
    folders,
    allTabCards: tabCards,
    cardsById,
    switchTab,
    addTab,
    removeTab,
    renameTab,
    saveTabToShelf,
    moveTabToLibrary,
    addCard,
    addPortalCard,
    updateCard,
    removeCard,
    reorder,
    fold,
    unfold,
    hide,
    unhide,
    saveToShelf,
    moveToLibrary,
    createFolder,
    runDockPrompt,
    promptLoading,
    promptError,
    brainFeedItems,
    reindexCard,
    flipCard,
    isFlippedCard,
  }
}
