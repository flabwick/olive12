import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { deleteCard, getAllCards, putCard } from '../card/cardStorage'
import { deleteLinksForSource, getAllLinks, rebuildLinksForCard } from '../card/linkStorage'
import { createCard, updateCardFields } from '../card/createCard'
import { createFolder as makeFolderObject } from '../folder/createFolder'
import { getAllFolders, putFolder } from '../folder/folderStorage'
import { supabase } from '../lib/supabaseClient'
import { assembleContext } from '../prompt/assembleContext'
import { createCardSyncScheduler } from '../sync/cardSync'
import { makeCardSupabaseStorage } from '../sync/cardSupabaseStorage'
import { makeTabSupabaseStorage } from './tabSupabaseStorage'
import { indexCard } from '../brain/indexCard'
import { enrichIndexEntry } from '../brain/finishIndexResult'
import { getAllIndexEntries, getIndexEntry as getStoredIndexEntry, putIndexEntry } from '../brain/indexEntryStorage'
import { INDEX_STAGES, logIndexEvent } from '../debug/indexPipelineDebug'
import { detectStaleEntries } from '../brain/brainFeedLogic'
import {
  closeSavedTab,
  createTab,
  createTabCard,
  isTabOpen,
  moveTabToLibrary as moveTabToLibraryPure,
  nextPosition,
  removeTab as removeTabPure,
  removeTabCard,
  reopenTab,
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
import { isOrphanTabCandidate } from './tabVaultLogic'

const ACTIVE_TAB_KEY = 'olive12:activeTabId'

function getOpenTabs(tabList) {
  return tabList.filter(isTabOpen)
}

function pickActiveTabId(tabList, preferredId) {
  const open = getOpenTabs(tabList)
  if (preferredId && open.some((t) => t.id === preferredId)) return preferredId
  return open[0]?.id ?? null
}

function planPortalReplacement(cardId, tabCards) {
  const matchingTabCards = tabCards.filter((tc) => tc.cardId === cardId)
  const portalCards = matchingTabCards.map(() =>
    createCard({ type: 'portal', config: { target_card_id: cardId } }),
  )
  const portalTabCards = matchingTabCards.map((tc, i) =>
    createTabCard({ tabId: tc.tabId, cardId: portalCards[i].id, position: tc.position }),
  )
  return { matchingTabCards, portalCards, portalTabCards }
}

async function applyPortalReplacement({
  cardId,
  updatedCard,
  matchingTabCards,
  portalCards,
  portalTabCards,
  cardsById,
  setCardsById,
  setTabCards,
}) {
  const newCardsById = { ...cardsById, [cardId]: updatedCard }
  for (const pc of portalCards) newCardsById[pc.id] = pc

  setCardsById(newCardsById)
  setTabCards((prev) => [
    ...prev.filter((tc) => tc.cardId !== cardId),
    ...portalTabCards,
  ])

  await putCard(updatedCard)
  await Promise.all([
    ...portalCards.map((pc) => putCard(pc)),
    ...portalTabCards.map((tc) => putTabCard(tc)),
    ...matchingTabCards.map((tc) => deleteTabCard(tc.tabId, cardId)),
  ])
  await Promise.all(portalCards.map((pc) => rebuildLinksForCard(pc)))
}

function resolveIndexTargetId(card) {
  if (!card) return null
  if (card.type === 'portal') return card.config?.target_card_id ?? null
  return card.id
}

function resolveIndexTarget(card, cardsById) {
  const targetId = resolveIndexTargetId(card)
  return targetId ? cardsById[targetId] : null
}

function buildTabRow(tab, cardIds, userId) {
  return {
    id: tab.id,
    user_id: userId,
    name: tab.name,
    saved_location: tab.savedLocation,
    saved_folder_id: tab.savedFolderId ?? null,
    card_ids: cardIds,
    created_at: new Date(tab.createdAt).toISOString(),
    updated_at: new Date(tab.updatedAt).toISOString(),
  }
}

export function useTabs({ userId } = {}) {
  const [isReady, setIsReady] = useState(false)
  const [tabs, setTabs] = useState([])
  const [activeTabId, setActiveTabId] = useState(null)
  const [tabCards, setTabCards] = useState([])
  const [cardsById, setCardsById] = useState({})
  const [folders, setFolders] = useState([])
  const [indexEntries, setIndexEntries] = useState([])
  const [allLinks, setAllLinks] = useState([])
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState('')
  const schedulerRef = useRef(null)
  const storageRef = useRef(null)
  const tabStorageRef = useRef(null)
  const [dismissedBrainIds, setDismissedBrainIds] = useState(() => new Set())
  const [flippedCardIds, setFlippedCardIds] = useState(() => new Set())
  const [indexingCardIds, setIndexingCardIds] = useState(() => new Set())

  const indexEntriesById = useMemo(
    () => Object.fromEntries(indexEntries.map((e) => [e.cardId, e])),
    [indexEntries],
  )

  useEffect(() => {
    if (!userId) {
      schedulerRef.current = null
      storageRef.current = null
      tabStorageRef.current = null
      return
    }
    const storage = makeCardSupabaseStorage(supabase)
    storageRef.current = storage
    schedulerRef.current = createCardSyncScheduler({ userId, debounceMs: 3000, storage })
    tabStorageRef.current = makeTabSupabaseStorage(supabase)
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
      const activeTab = getOpenTabs(sortedTabs)[0] ?? sortedTabs[0]

      if (activeTab) {
        const orphans = freshCards.filter((c) =>
          isOrphanTabCandidate(c, allTabCards, freshById),
        )

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

      if (tabStorageRef.current) {
        try {
          const remoteSavedTabs = await tabStorageRef.current.fetchSavedTabsForUser(userId)
          const localTabIdSet = new Set(allTabs.map((t) => t.id))
          const freshCardIdSet = new Set(freshCards.map((c) => c.id))
          const existingTabCardIds = new Set(allTabCards.map((tc) => tc.cardId))

          const newTabs = []
          for (const remote of remoteSavedTabs) {
            if (localTabIdSet.has(remote.id)) {
              const local = allTabs.find((t) => t.id === remote.id)
              const remoteTs = new Date(remote.updated_at).getTime()
              if (local && remoteTs > local.updatedAt) {
                const updatedTab = {
                  ...local,
                  name: remote.name,
                  savedLocation: remote.saved_location,
                  savedFolderId: remote.saved_folder_id ?? null,
                  updatedAt: remoteTs,
                }
                await putTab(updatedTab)
                setTabs((prev) => prev.map((t) => (t.id === remote.id ? updatedTab : t)))
              }
              continue
            }

            const newTab = {
              id: remote.id,
              name: remote.name,
              kind: 'blank',
              order: allTabs.length + newTabs.length,
              savedLocation: remote.saved_location,
              savedFolderId: remote.saved_folder_id ?? null,
              isOpen: false,
              createdAt: new Date(remote.created_at).getTime(),
              updatedAt: new Date(remote.updated_at).getTime(),
            }
            await putTab(newTab)

            const newTabCards = []
            for (let i = 0; i < remote.card_ids.length; i++) {
              const cardId = remote.card_ids[i]
              if (freshCardIdSet.has(cardId) && !existingTabCardIds.has(cardId)) {
                const tc = createTabCard({ tabId: remote.id, cardId, position: i })
                await putTabCard(tc)
                newTabCards.push(tc)
                existingTabCardIds.add(cardId)
              }
            }
            if (newTabCards.length > 0) {
              setTabCards((prev) => [...prev, ...newTabCards])
            }
            newTabs.push(newTab)
          }
          if (newTabs.length > 0) {
            setTabs((prev) => [...prev, ...newTabs])
          }

          const remoteIdSet = new Set(remoteSavedTabs.map((t) => t.id))
          for (const localTab of allTabs.filter((t) => t.savedLocation !== 'none')) {
            if (!remoteIdSet.has(localTab.id)) {
              const cardIds = allTabCards
                .filter((tc) => tc.tabId === localTab.id)
                .sort((a, b) => a.position - b.position)
                .map((tc) => tc.cardId)
              await tabStorageRef.current.upsertSavedTab(buildTabRow(localTab, cardIds, userId))
            }
          }
        } catch (err) {
          console.error('[useTabs] tab sync error:', err)
        }
      }
    })
  }, [isReady, userId])

  useEffect(() => {
    let active = true

    async function init() {
      const [storedTabs, tcs, cards, fds, entries, links] = await Promise.all([
        getAllTabs(), getAllTabCards(), getAllCards(), getAllFolders(),
        getAllIndexEntries(), getAllLinks(),
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
        const defaultTab = createTab({ order: 0 })
        await putTab(defaultTab)
        if (!active) return
        setTabs([defaultTab])
        setActiveTabId(defaultTab.id)
        setTabCards([])
        setCardsById({})
      } else {
        const savedId = localStorage.getItem(ACTIVE_TAB_KEY)
        let openTabs = getOpenTabs(sortedTabs)

        if (openTabs.length === 0) {
          const defaultTab = createTab({ order: sortedTabs.length })
          await putTab(defaultTab)
          if (!active) return
          setTabs([...sortedTabs, defaultTab])
          setActiveTabId(defaultTab.id)
        } else {
          setTabs(sortedTabs)
          setActiveTabId(pickActiveTabId(sortedTabs, savedId))
        }

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

  const switchTab = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab && !isTabOpen(tab)) {
      const updated = reopenTab(tab)
      await putTab(updated)
      setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
    }
    setActiveTabId(tabId)
  }, [tabs])

  const addTab = useCallback(async () => {
    const newTab = createTab({ order: tabs.length })
    await putTab(newTab)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [tabs.length])

  const removeTab = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return

    if (tab.savedLocation === 'shelf' || tab.savedLocation === 'library') {
      const openBefore = getOpenTabs(tabs)
      const closedIndex = openBefore.findIndex((t) => t.id === tabId)
      const updated = closeSavedTab(tab)
      await putTab(updated)
      const nextTabs = tabs.map((t) => (t.id === tabId ? updated : t))
      setTabs(nextTabs)

      if (activeTabId === tabId) {
        const remainingOpen = openBefore.filter((t) => t.id !== tabId)
        if (remainingOpen.length === 0) {
          const defaultTab = createTab({ order: nextTabs.length })
          await putTab(defaultTab)
          setTabs([...nextTabs, defaultTab])
          setActiveTabId(defaultTab.id)
        } else {
          const adjacent = remainingOpen[closedIndex] ?? remainingOpen[closedIndex - 1] ?? remainingOpen[0]
          setActiveTabId(adjacent.id)
        }
      }
      return
    }

    await deleteAllTabCards(tabId)
    await deleteTabStorage(tabId)

    const nextTabs = removeTabPure(tabs, tabId)
    const remainingOpen = getOpenTabs(nextTabs)

    if (remainingOpen.length === 0) {
      const defaultTab = createTab({ order: nextTabs.length })
      await putTab(defaultTab)
      setTabs([...nextTabs, defaultTab])
      setActiveTabId(defaultTab.id)
    } else {
      let nextActiveId = activeTabId
      if (activeTabId === tabId) {
        const openBefore = getOpenTabs(tabs)
        const removedIndex = openBefore.findIndex((t) => t.id === tabId)
        const openAfter = openBefore.filter((t) => t.id !== tabId)
        nextActiveId = (openAfter[removedIndex] ?? openAfter[removedIndex - 1] ?? openAfter[0]).id
      }
      setTabs(nextTabs)
      setActiveTabId(nextActiveId)
    }

    setTabCards((prev) => prev.filter((tc) => tc.tabId !== tabId))
  }, [tabs, activeTabId])

  const renameTab = useCallback(async (tabId, name) => {
    const nextTabs = setTabNamePure(tabs, tabId, name)
    const updated = nextTabs.find((t) => t.id === tabId)
    if (updated) {
      await putTab(updated)
      if (userId && tabStorageRef.current && updated.savedLocation !== 'none') {
        const cardIds = tabCards
          .filter((tc) => tc.tabId === tabId)
          .sort((a, b) => a.position - b.position)
          .map((tc) => tc.cardId)
        tabStorageRef.current
          .upsertSavedTab(buildTabRow(updated, cardIds, userId))
          .catch((err) => console.error('[useTabs] tab push:', err))
      }
    }
    setTabs(nextTabs)
  }, [tabs, tabCards, userId])

  const saveTabToShelf = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = saveTabToShelfPure(tab)
    await putTab(updated)
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
    if (userId && tabStorageRef.current) {
      const cardIds = tabCards
        .filter((tc) => tc.tabId === tabId)
        .sort((a, b) => a.position - b.position)
        .map((tc) => tc.cardId)
      tabStorageRef.current
        .upsertSavedTab(buildTabRow(updated, cardIds, userId))
        .catch((err) => console.error('[useTabs] tab push:', err))
    }
  }, [tabs, tabCards, userId])

  const moveTabToLibrary = useCallback(async (tabId, folderId = null) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = moveTabToLibraryPure(tab, folderId)
    await putTab(updated)
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
    if (userId && tabStorageRef.current) {
      const cardIds = tabCards
        .filter((tc) => tc.tabId === tabId)
        .sort((a, b) => a.position - b.position)
        .map((tc) => tc.cardId)
      tabStorageRef.current
        .upsertSavedTab(buildTabRow(updated, cardIds, userId))
        .catch((err) => console.error('[useTabs] tab push:', err))
    }
  }, [tabs, tabCards, userId])

  const openTabs = useMemo(() => getOpenTabs(tabs), [tabs])
  const activeTab = openTabs.find((t) => t.id === activeTabId) ?? openTabs[0] ?? null

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
      schedulerRef.current?.scheduleSync()
      return card
    },
    [activeTab, tabCards],
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
      schedulerRef.current?.scheduleSync()
      return card
    },
    [activeTab, tabCards, cardsById],
  )

  const updateCard = useCallback(
    async (cardId, fields) => {
      const card = cardsById[cardId]
      if (!card) return
      const updated = updateCardFields(card, fields)
      setCardsById((prev) => ({ ...prev, [cardId]: updated }))
      await putCard(updated)
      await rebuildLinksForCard(updated)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById],
  )

  const removeCard = useCallback(
    async (cardId) => {
      const card = cardsById[cardId]
      if (!card) return

      const tc = tabCards.find((t) => t.cardId === cardId)
      const nextTabCards = removeTabCard(tabCards, cardId)

      // Portal: remove tab reference and delete the portal shell only.
      if (card.type === 'portal') {
        const { [cardId]: _, ...rest } = cardsById
        setTabCards(nextTabCards)
        setCardsById(rest)
        await Promise.all([
          deleteCard(cardId),
          deleteLinksForSource(cardId),
          ...(tc ? [deleteTabCard(tc.tabId, cardId)] : []),
          ...nextTabCards.map((t) => putTabCard(t)),
          ...(storageRef.current?.deleteRemoteCard
            ? [storageRef.current.deleteRemoteCard(cardId)]
            : []),
        ])
        return
      }

      // Vault card on tab: detach from tab only — shelf/library copy stays.
      if (card.location === 'shelf' || card.location === 'library') {
        setTabCards(nextTabCards)
        await Promise.all([
          ...(tc ? [deleteTabCard(tc.tabId, cardId)] : []),
          ...nextTabCards.map((t) => putTabCard(t)),
        ])
        return
      }

      // Unsaved draft: remove from tab and delete entirely.
      const { [cardId]: _, ...rest } = cardsById
      setTabCards(nextTabCards)
      setCardsById(rest)
      await Promise.all([
        deleteCard(cardId),
        deleteLinksForSource(cardId),
        ...(tc ? [deleteTabCard(tc.tabId, cardId)] : []),
        ...nextTabCards.map((t) => putTabCard(t)),
        ...(storageRef.current?.deleteRemoteCard
          ? [storageRef.current.deleteRemoteCard(cardId)]
          : []),
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
      if (!card || card.type === 'portal') return
      const updated = updateCardFields(card, { location: 'shelf' })
      const { matchingTabCards, portalCards, portalTabCards } = planPortalReplacement(cardId, tabCards)

      await applyPortalReplacement({
        cardId,
        updatedCard: updated,
        matchingTabCards,
        portalCards,
        portalTabCards,
        cardsById,
        setCardsById,
        setTabCards,
      })
      schedulerRef.current?.scheduleSync()
    },
    [cardsById, tabCards],
  )

  const moveToLibrary = useCallback(
    async (cardId, folderId = null) => {
      const card = cardsById[cardId]
      if (!card) return

      logIndexEvent({
        stage: INDEX_STAGES.MOVE_TO_LIBRARY,
        cardId,
        status: 'start',
        detail: { folderId, title: card.title },
      })

      const updated = updateCardFields(card, { location: 'library', folderId })
      const { matchingTabCards, portalCards, portalTabCards } = planPortalReplacement(cardId, tabCards)

      if (matchingTabCards.length > 0) {
        await applyPortalReplacement({
          cardId,
          updatedCard: updated,
          matchingTabCards,
          portalCards,
          portalTabCards,
          cardsById,
          setCardsById,
          setTabCards,
        })
      } else {
        setCardsById((prev) => ({ ...prev, [cardId]: updated }))
        await putCard(updated)
      }
      schedulerRef.current?.scheduleSync()

      setIndexingCardIds((prev) => new Set([...prev, cardId]))
      try {
        const entry = await indexCard(updated, { userId })
        setIndexEntries((prev) => {
          const next = prev.filter((e) => e.cardId !== cardId)
          return [...next, entry]
        })
        if (!entry.summary?.trim() && updated.body?.trim()) {
          const enriched = enrichIndexEntry(entry, updated)
          if (enriched.summary !== entry.summary) {
            await putIndexEntry(enriched)
            setIndexEntries((prev) => {
              const next = prev.filter((e) => e.cardId !== cardId)
              return [...next, enriched]
            })
          }
        }
        logIndexEvent({
          stage: INDEX_STAGES.STATE_UPDATE,
          cardId,
          status: 'ok',
          detail: {
            title: entry.title,
            summaryLen: entry.summary.length,
            summaryPreview: entry.summary.slice(0, 120),
            tags: entry.tags,
          },
        })
      } catch (err) {
        logIndexEvent({
          stage: INDEX_STAGES.MOVE_TO_LIBRARY,
          cardId,
          status: 'error',
          error: err,
        })
        const stored = await getStoredIndexEntry(cardId)
        if (stored) {
          setIndexEntries((prev) => {
            const next = prev.filter((e) => e.cardId !== cardId)
            return [...next, stored]
          })
          logIndexEvent({
            stage: INDEX_STAGES.DEXIE_RELOAD,
            cardId,
            status: 'ok',
            detail: { note: 'Recovered entry from Dexie after invoke failure' },
          })
        }
        console.error('[useTabs] wiki-index error:', err)
      } finally {
        setIndexingCardIds((prev) => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }
    },
    [cardsById, tabCards, userId],
  )

  const createFolder = useCallback(async ({ name = 'New folder', parentId = null } = {}) => {
    const folder = makeFolderObject({ name, parentId })
    setFolders((prev) => [...prev, folder])
    await putFolder(folder)
    return folder
  }, [])

  const entries = tabCards
    .filter((tc) => tc.tabId === activeTabId)
    .sort((a, b) => a.position - b.position)
    .map((tc) => {
      const card = cardsById[tc.cardId]
      const targetId = resolveIndexTargetId(card)
      const target = targetId ? cardsById[targetId] : null
      const indexLocation = target?.location ?? card?.location ?? 'none'
      const isLibrary = indexLocation === 'library'
      return {
        card,
        position: tc.position,
        foldState: tc.foldState,
        hiddenState: tc.hiddenState,
        indexTargetId: targetId,
        indexEntry: isLibrary && targetId
          ? enrichIndexEntry(indexEntriesById[targetId], target ?? card)
          : undefined,
        indexLocation,
        indexLoading: isLibrary && targetId ? indexingCardIds.has(targetId) : false,
      }
    })
    .filter((entry) => entry.card !== undefined)

  const shelfEntries = Object.values(cardsById)
    .filter((c) => c.location === 'shelf')
    .sort((a, b) => a.createdAt - b.createdAt)

  const libraryEntries = Object.values(cardsById)
    .filter((c) => c.location === 'library')
    .sort((a, b) => b.updatedAt - a.updatedAt)

  const shelfTabs = tabs.filter((t) => t.savedLocation === 'shelf')
  const libraryTabs = tabs.filter((t) => t.savedLocation === 'library')

  const rawBrainFeedFlags = detectStaleEntries(Object.values(cardsById), indexEntries, allLinks)
  const brainFeedItems = rawBrainFeedFlags
    .filter((f) => !dismissedBrainIds.has(f.cardId))
    .map((f) => ({
      cardId: f.cardId,
      title: cardsById[f.cardId]?.title ?? '',
      reason: f.reason,
    }))

  const dismissBrainItem = useCallback((cardId) => {
    setDismissedBrainIds((prev) => new Set([...prev, cardId]))
  }, [])

  const onBrainAccept = useCallback((cardId) => {
    console.log('[useTabs] onBrainAccept (stub):', cardId)
  }, [])

  const getIndexEntry = useCallback(
    (cardId) => indexEntriesById[cardId],
    [indexEntriesById],
  )

  const isIndexing = useCallback(
    (cardId) => indexingCardIds.has(cardId),
    [indexingCardIds],
  )

  const ensureIndexEntry = useCallback(
    async (cardId) => {
      const card = cardsById[cardId]
      if (!card || card.location !== 'library') {
        logIndexEvent({
          stage: INDEX_STAGES.ENSURE_INDEX,
          cardId,
          status: 'skip',
          detail: { reason: !card ? 'card not found' : `location=${card.location}` },
        })
        return
      }

      if (indexEntriesById[cardId]) {
        const existing = indexEntriesById[cardId]
        if (!existing.summary?.trim() && card.body?.trim()) {
          const enriched = enrichIndexEntry(existing, card)
          if (enriched.summary !== existing.summary) {
            await putIndexEntry(enriched)
            setIndexEntries((prev) => {
              const next = prev.filter((e) => e.cardId !== cardId)
              return [...next, enriched]
            })
            logIndexEvent({
              stage: INDEX_STAGES.DEXIE_RELOAD,
              cardId,
              status: 'ok',
              detail: { source: 'body-fallback-on-flip', summaryLen: enriched.summary.length },
            })
            return
          }
        }
        logIndexEvent({
          stage: INDEX_STAGES.LOOKUP,
          cardId,
          status: 'ok',
          detail: { source: 'react-state', summaryLen: existing.summary?.length ?? 0 },
        })
        return
      }

      const stored = await getStoredIndexEntry(cardId)
      if (stored) {
        setIndexEntries((prev) => {
          const next = prev.filter((e) => e.cardId !== cardId)
          return [...next, stored]
        })
        logIndexEvent({
          stage: INDEX_STAGES.DEXIE_RELOAD,
          cardId,
          status: 'ok',
          detail: { source: 'dexie-on-flip', summaryLen: stored.summary.length },
        })
        return
      }

      if (indexingCardIds.has(cardId)) {
        logIndexEvent({
          stage: INDEX_STAGES.ENSURE_INDEX,
          cardId,
          status: 'skip',
          detail: { reason: 'already indexing' },
        })
        return
      }

      setIndexingCardIds((prev) => new Set([...prev, cardId]))
      try {
        const entry = await indexCard(card, { userId })
        setIndexEntries((prev) => {
          const next = prev.filter((e) => e.cardId !== cardId)
          return [...next, entry]
        })
        logIndexEvent({
          stage: INDEX_STAGES.STATE_UPDATE,
          cardId,
          status: 'ok',
          detail: { trigger: 'flip', title: entry.title, summaryLen: entry.summary.length, summaryPreview: entry.summary.slice(0, 120) },
        })
      } catch (err) {
        logIndexEvent({
          stage: INDEX_STAGES.ENSURE_INDEX,
          cardId,
          status: 'error',
          error: err,
        })
        console.error('[useTabs] wiki-index error on flip:', err)
      } finally {
        setIndexingCardIds((prev) => {
          const next = new Set(prev)
          next.delete(cardId)
          return next
        })
      }
    },
    [cardsById, indexEntriesById, indexingCardIds, userId],
  )

  const flipCard = useCallback(
    (cardId) => {
      const wasFlipped = flippedCardIds.has(cardId)
      setFlippedCardIds((prev) => {
        const next = new Set(prev)
        if (next.has(cardId)) next.delete(cardId)
        else next.add(cardId)
        return next
      })

      const card = cardsById[cardId]
      const targetId =
        card?.type === 'portal' ? card.config?.target_card_id : cardId

      logIndexEvent({
        stage: INDEX_STAGES.FLIP,
        cardId: targetId ?? cardId,
        status: 'info',
        detail: {
          portalId: card?.type === 'portal' ? cardId : null,
          wasFlipped,
          nowFlipped: !wasFlipped,
          targetLocation: targetId ? cardsById[targetId]?.location : card?.location,
        },
      })

      if (!wasFlipped && targetId) ensureIndexEntry(targetId)
    },
    [cardsById, flippedCardIds, ensureIndexEntry],
  )

  const isFlipped = useCallback((cardId) => flippedCardIds.has(cardId), [flippedCardIds])

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
        if (data?.truncated) {
          console.warn('[useTabs] dock-prompt response was truncated after continuations')
        }
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

  return {
    tab: activeTab,
    tabs,
    openTabs,
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
    onBrainAccept,
    onBrainDismiss: dismissBrainItem,
    flipCard,
    isFlipped,
    getIndexEntry,
    isIndexing,
  }
}
