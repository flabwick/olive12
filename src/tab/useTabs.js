import { useCallback, useEffect, useRef, useState } from 'react'
import { isFlipped as isFlippedFn, toggleFlip } from '../card/flipLogic'
import { parseStreamChunk } from '../prompt/streamParser'
import { deleteCard, getAllCards, putCard } from '../card/cardStorage'
import { deleteLinksForSource, rebuildLinksForCard } from '../card/linkStorage'
import { createCard, updateCardFields } from '../card/createCard'
import {
  collectDescendantIds,
  createFolder as makeFolderObject,
  isFolderDescendant,
} from '../folder/createFolder'
import { deleteFolder as deleteFolderStorage, getAllFolders, putFolder } from '../folder/folderStorage'
import { supabase } from '../lib/supabaseClient'
import { createStack as makeStackCard } from '../stack/createStack'
import { addMember, flattenIds, isStackCard, removeMember, reorderMembers, setTopCard } from '../stack/stackLogic'
import { assembleContext } from '../prompt/assembleContext'
import { createCardSyncScheduler } from '../sync/cardSync'
import { makeCardSupabaseStorage } from '../sync/cardSupabaseStorage'
import { makeFolderSupabaseStorage } from '../sync/folderSupabaseStorage'
import { deleteFolderRemote, syncFolders } from '../sync/folderSync'
import { computeContentHash } from '../sync/cardSyncLogic'
import { getBrainFeedItems } from '../brain/brainFeedLogic'
import { createIndexEntry } from '../brain/createIndexEntry'
import { getAllIndexEntries, putIndexEntry } from '../brain/indexEntryStorage'
import { db } from '../db/vaultDb'
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
  updateTabFields,
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
import { makeTabSupabaseStorage } from './tabSupabaseStorage'
import { getDockCardIds } from './dockCardStorage'
import { isOrphanTabCandidate } from './tabVaultLogic'

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
  const [selectedCardIds, setSelectedCardIds] = useState(() => new Set())
  const [promptLoading, setPromptLoading] = useState(false)
  const [promptError, setPromptError] = useState('')
  const schedulerRef = useRef(null)
  const storageRef = useRef(null)
  const folderStorageRef = useRef(null)
  const tabStorageRef = useRef(null)

  useEffect(() => {
    if (!userId) {
      schedulerRef.current = null
      storageRef.current = null
      folderStorageRef.current = null
      tabStorageRef.current = null
      return
    }
    const storage = makeCardSupabaseStorage(supabase)
    storageRef.current = storage
    schedulerRef.current = createCardSyncScheduler({ userId, debounceMs: 3000, storage })
    folderStorageRef.current = makeFolderSupabaseStorage(supabase)
    tabStorageRef.current = makeTabSupabaseStorage(supabase)
  }, [userId])

  useEffect(() => {
    if (!isReady || !userId || !schedulerRef.current) return

    async function doSync() {
      // 1. Folder sync
      if (folderStorageRef.current) {
        await syncFolders(userId, folderStorageRef.current)
        const freshFolders = await getAllFolders()
        setFolders(freshFolders)
      }

      // 2. Card sync
      await schedulerRef.current.runNow()

      // 3. Pull saved tabs
      if (tabStorageRef.current) {
        try {
          const remoteTabs = await tabStorageRef.current.fetchSavedTabsForUser(userId)
          const localTabsNow = await getAllTabs()
          const localById = Object.fromEntries(localTabsNow.map((t) => [t.id, t]))

          const tabsToAdd = []
          const tabsToUpdate = {}
          let nextOrder = localTabsNow.length

          for (const row of remoteTabs) {
            const existing = localById[row.id]
            if (!existing) {
              const newTab = {
                id: row.id,
                name: row.name,
                kind: 'blank',
                order: nextOrder++,
                savedLocation: row.saved_location,
                savedFolderId: row.saved_folder_id ?? null,
                isOpen: false,
                createdAt: new Date(row.created_at).getTime(),
                updatedAt: new Date(row.updated_at).getTime(),
              }
              await putTab(newTab)
              tabsToAdd.push(newTab)
            } else {
              const remoteTs = new Date(row.updated_at).getTime()
              if (remoteTs > (existing.updatedAt ?? 0)) {
                const updated = {
                  ...existing,
                  name: row.name,
                  savedLocation: row.saved_location,
                  savedFolderId: row.saved_folder_id ?? null,
                  updatedAt: remoteTs,
                }
                await putTab(updated)
                tabsToUpdate[updated.id] = updated
              }
            }
          }

          if (tabsToAdd.length > 0 || Object.keys(tabsToUpdate).length > 0) {
            setTabs((prev) => {
              const withUpdates = prev.map((t) => tabsToUpdate[t.id] ?? t)
              return [...withUpdates, ...tabsToAdd]
            })
          }
        } catch (err) {
          console.error('[useTabs] pull saved tabs error:', err)
        }
      }

      // 4. Orphan detection
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
        const dockIds = new Set(await getDockCardIds())
        const orphans = freshCards.filter((c) => {
          if (knownIds.has(c.id)) return false
          if (dockIds.has(c.id)) return false
          return isOrphanTabCandidate(c, allTabCards, freshById)
        })

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
    }

    doSync()
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
        const openSortedTabs = sortedTabs.filter(isTabOpen)
        const restoredId = savedId && openSortedTabs.find((t) => t.id === savedId)
          ? savedId
          : (openSortedTabs[0]?.id ?? sortedTabs[0].id)
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
    const allTabs = await getAllTabs()
    const newTab = createTab({ name: 'New tab', order: allTabs.length })
    await putTab(newTab)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)
  }, [])

  const removeTab = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)

    // Saved tabs (shelf/library): mark as closed so vault still shows them but tab bar hides them.
    if (tab?.savedLocation !== 'none') {
      const closed = closeSavedTab(tab)
      await putTab(closed)
      setTabs((prev) => prev.map((t) => (t.id === tabId ? closed : t)))

      if (activeTabId === tabId) {
        const other = tabs.find((t) => t.id !== tabId && isTabOpen(t))
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
        // Prefer an open tab adjacent to the removed slot; fall back to any open tab
        const adjacent = [nextTabs[removedIndex], nextTabs[removedIndex - 1], ...nextTabs]
          .filter(Boolean)
          .find(isTabOpen)
          ?? nextTabs[0]
        nextActiveId = adjacent.id
      }
      setTabs(nextTabs)
      setActiveTabId(nextActiveId)
    }

    setTabCards((prev) => prev.filter((tc) => tc.tabId !== tabId))
  }, [tabs, activeTabId])

  const reopenSavedTab = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const opened = reopenTab(tab)
    await putTab(opened)
    setTabs((prev) => prev.map((t) => (t.id === tabId ? opened : t)))
    setActiveTabId(tabId)
  }, [tabs])

  const renameTab = useCallback(async (tabId, name) => {
    const nextTabs = setTabNamePure(tabs, tabId, name)
    const updated = nextTabs.find((t) => t.id === tabId)
    if (updated) {
      await putTab(updated)
      if (updated.savedLocation !== 'none' && tabStorageRef.current) {
        const cardIds = tabCards.filter((tc) => tc.tabId === tabId).map((tc) => tc.cardId)
        tabStorageRef.current.upsertSavedTab({
          id: updated.id,
          user_id: userId,
          name: updated.name,
          saved_location: updated.savedLocation,
          saved_folder_id: updated.savedFolderId ?? null,
          card_ids: cardIds,
          created_at: new Date(updated.createdAt).toISOString(),
          updated_at: new Date(updated.updatedAt).toISOString(),
        }).catch((err) => console.error('[useTabs] renameTab upsert:', err))
      }
    }
    setTabs(nextTabs)
  }, [tabs, tabCards, userId])

  const saveTabToShelf = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = saveTabToShelfPure(tab)
    await putTab(updated)
    if (tabStorageRef.current) {
      const cardIds = tabCards.filter((tc) => tc.tabId === tabId).map((tc) => tc.cardId)
      tabStorageRef.current.upsertSavedTab({
        id: updated.id,
        user_id: userId,
        name: updated.name,
        saved_location: 'shelf',
        saved_folder_id: null,
        card_ids: cardIds,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      }).catch((err) => console.error('[useTabs] saveTabToShelf upsert:', err))
    }
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
  }, [tabs, tabCards, userId])

  const moveTabToLibrary = useCallback(async (tabId, folderId = null) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = moveTabToLibraryPure(tab, folderId)
    await putTab(updated)
    if (tabStorageRef.current) {
      const cardIds = tabCards.filter((tc) => tc.tabId === tabId).map((tc) => tc.cardId)
      tabStorageRef.current.upsertSavedTab({
        id: updated.id,
        user_id: userId,
        name: updated.name,
        saved_location: 'library',
        saved_folder_id: folderId ?? null,
        card_ids: cardIds,
        created_at: new Date(updated.createdAt).toISOString(),
        updated_at: new Date(updated.updatedAt).toISOString(),
      }).catch((err) => console.error('[useTabs] moveTabToLibrary upsert:', err))
    }
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
  }, [tabs, tabCards, userId])

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

  const addTabCard = useCallback(
    async (cardId) => {
      if (!activeTab) return
      const activeTabCards = tabCards.filter((tc) => tc.tabId === activeTab.id)
      const position = nextPosition(activeTabCards)
      const tc = createTabCard({ tabId: activeTab.id, cardId, position })
      setTabCards((prev) => [...prev, tc])
      await putTabCard(tc)
    },
    [activeTab, tabCards],
  )

  const addToCardsById = useCallback((card) => {
    setCardsById((prev) => ({ ...prev, [card.id]: card }))
  }, [])

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

  const detachCardFromTab = useCallback(
    async (cardId) => {
      const tc = tabCards.find((t) => t.cardId === cardId)
      const nextTabCards = removeTabCard(tabCards, cardId)
      setTabCards(nextTabCards)
      await Promise.all([
        ...(tc ? [deleteTabCard(tc.tabId, cardId)] : []),
        ...nextTabCards.map((t) => putTabCard(t)),
      ])
    },
    [tabCards],
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
    if (folderStorageRef.current && userId) {
      syncFolders(userId, folderStorageRef.current).catch((err) =>
        console.error('[useTabs] createFolder sync:', err),
      )
    }
    return folder
  }, [userId])

  const deleteSavedTab = useCallback(async (tabId) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (!tab) return
    const updated = updateTabFields(tab, { savedLocation: 'none', savedFolderId: null })
    await putTab(updated)
    setTabs((prev) => prev.map((t) => (t.id === tabId ? updated : t)))
    if (tabStorageRef.current) {
      tabStorageRef.current.deleteSavedTab(tabId).catch((err) =>
        console.error('[useTabs] deleteSavedTab remote:', err),
      )
    }
  }, [tabs])

  const renameCard = useCallback(async (cardId, title) => {
    const card = cardsById[cardId]
    if (!card) return
    const updated = updateCardFields(card, { title })
    setCardsById((prev) => ({ ...prev, [cardId]: updated }))
    await putCard(updated)
    schedulerRef.current?.scheduleSync()
  }, [cardsById])

  const moveCardToFolder = useCallback(async (cardId, folderId) => {
    const card = cardsById[cardId]
    if (!card) return
    const updated = updateCardFields(card, { folderId })
    setCardsById((prev) => ({ ...prev, [cardId]: updated }))
    await putCard(updated)
    schedulerRef.current?.scheduleSync()
  }, [cardsById])

  const moveCardToShelf = useCallback(async (cardId) => {
    const card = cardsById[cardId]
    if (!card) return
    const updated = updateCardFields(card, { location: 'shelf', folderId: null })
    setCardsById((prev) => ({ ...prev, [cardId]: updated }))
    await putCard(updated)
    schedulerRef.current?.scheduleSync()
  }, [cardsById])

  const renameFolder = useCallback(async (folderId, name) => {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return
    const updated = { ...folder, name, updatedAt: Date.now() }
    setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)))
    await putFolder(updated)
    if (folderStorageRef.current && userId) {
      syncFolders(userId, folderStorageRef.current).catch((err) =>
        console.error('[useTabs] renameFolder sync:', err),
      )
    }
  }, [folders, userId])

  const deleteFolder = useCallback(async (folderId, mode) => {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return

    if (mode === 'reassign') {
      const parentId = folder.parentId ?? null

      // Re-parent direct child folders
      const childFolders = folders.filter((f) => f.parentId === folderId)
      const updatedChildFolders = childFolders.map((cf) => ({ ...cf, parentId, updatedAt: Date.now() }))
      await Promise.all(updatedChildFolders.map((cf) => putFolder(cf)))

      // Re-parent cards in this folder
      const newCardsById = { ...cardsById }
      const affectedCards = Object.values(cardsById).filter((c) => c.folderId === folderId)
      for (const card of affectedCards) {
        const updated = updateCardFields(card, { folderId: parentId })
        newCardsById[card.id] = updated
        await putCard(updated)
      }

      // Re-parent saved tabs in this folder
      const affectedTabs = tabs.filter((t) => t.savedFolderId === folderId)
      const updatedTabs = affectedTabs.map((t) => updateTabFields(t, { savedFolderId: parentId }))
      await Promise.all(updatedTabs.map((t) => putTab(t)))

      await deleteFolderStorage(folderId)

      setFolders((prev) => [
        ...prev.filter((f) => f.id !== folderId).map((f) => {
          const updated = updatedChildFolders.find((cf) => cf.id === f.id)
          return updated ?? f
        }),
      ])
      setCardsById(newCardsById)
      setTabs((prev) => prev.map((t) => updatedTabs.find((u) => u.id === t.id) ?? t))

      if (folderStorageRef.current && userId) {
        deleteFolderRemote(folderId, userId, folderStorageRef.current)
      }
    } else if (mode === 'delete-contents') {
      const descendantIds = collectDescendantIds(folders, folderId)
      const allFolderIds = [folderId, ...descendantIds]
      const folderIdSet = new Set(allFolderIds)

      // Delete all cards in these folders
      const affectedCards = Object.values(cardsById).filter((c) => folderIdSet.has(c.folderId))
      for (const card of affectedCards) {
        await deleteCard(card.id)
        await deleteLinksForSource(card.id)
        storageRef.current?.deleteRemoteCard(card.id).catch((err) =>
          console.error('[useTabs] deleteFolder delete card remote:', err),
        )
      }
      const deletedCardIds = new Set(affectedCards.map((c) => c.id))

      // Move saved tabs in these folders to shelf
      const affectedTabs = tabs.filter((t) => folderIdSet.has(t.savedFolderId))
      const updatedTabs = affectedTabs.map((t) =>
        updateTabFields(t, { savedFolderId: null, savedLocation: 'shelf' }),
      )
      await Promise.all(updatedTabs.map((t) => putTab(t)))

      // Delete all folders
      await Promise.all(allFolderIds.map((id) => deleteFolderStorage(id)))

      if (folderStorageRef.current && userId) {
        for (const id of allFolderIds) {
          deleteFolderRemote(id, userId, folderStorageRef.current)
        }
      }

      const newCardsById = { ...cardsById }
      for (const id of deletedCardIds) delete newCardsById[id]

      setFolders((prev) => prev.filter((f) => !folderIdSet.has(f.id)))
      setCardsById(newCardsById)
      setTabCards((prev) => prev.filter((tc) => !deletedCardIds.has(tc.cardId)))
      setTabs((prev) => prev.map((t) => updatedTabs.find((u) => u.id === t.id) ?? t))
      await reloadLinks()
    }
  }, [folders, cardsById, tabs, tabCards, userId, reloadLinks])

  const moveFolder = useCallback(async (folderId, newParentId) => {
    if (newParentId !== null && isFolderDescendant(folders, folderId, newParentId)) return
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return
    const updated = { ...folder, parentId: newParentId, updatedAt: Date.now() }
    setFolders((prev) => prev.map((f) => (f.id === folderId ? updated : f)))
    await putFolder(updated)
    if (folderStorageRef.current && userId) {
      syncFolders(userId, folderStorageRef.current).catch((err) =>
        console.error('[useTabs] moveFolder sync:', err),
      )
    }
  }, [folders, userId])

  const bulkMoveCards = useCallback(async (cardIds, folderId) => {
    const updates = {}
    for (const cardId of cardIds) {
      const card = cardsById[cardId]
      if (!card) continue
      const updated = updateCardFields(card, { folderId })
      updates[cardId] = updated
      await putCard(updated)
    }
    setCardsById((prev) => ({ ...prev, ...updates }))
    schedulerRef.current?.scheduleSync()
  }, [cardsById])

  const bulkDeleteCards = useCallback(async (cardIds) => {
    const cardIdSet = new Set(cardIds)
    const tcsToDelete = tabCards.filter((tc) => cardIdSet.has(tc.cardId))
    const newTabCards = tabCards.filter((tc) => !cardIdSet.has(tc.cardId))
    const newCardsById = { ...cardsById }
    for (const cardId of cardIds) delete newCardsById[cardId]

    setCardsById(newCardsById)
    setTabCards(newTabCards)

    await Promise.all(
      cardIds.flatMap((cardId) => [deleteCard(cardId), deleteLinksForSource(cardId)]),
    )
    await Promise.all(tcsToDelete.map((tc) => deleteTabCard(tc.tabId, tc.cardId)))

    if (storageRef.current) {
      for (const cardId of cardIds) {
        storageRef.current.deleteRemoteCard(cardId).catch((err) =>
          console.error('[useTabs] bulkDeleteCards remote:', err),
        )
      }
    }

    await reloadLinks()
  }, [cardsById, tabCards, reloadLinks])

  const bulkMoveTabs = useCallback(async (tabIds, folderId) => {
    const updates = {}
    for (const tabId of tabIds) {
      const tab = tabs.find((t) => t.id === tabId)
      if (!tab) continue
      const updated = updateTabFields(tab, { savedFolderId: folderId, savedLocation: 'library' })
      updates[tabId] = updated
      await putTab(updated)
      if (tabStorageRef.current) {
        const cardIds = tabCards.filter((tc) => tc.tabId === tabId).map((tc) => tc.cardId)
        tabStorageRef.current.upsertSavedTab({
          id: updated.id,
          user_id: userId,
          name: updated.name,
          saved_location: 'library',
          saved_folder_id: folderId ?? null,
          card_ids: cardIds,
          created_at: new Date(updated.createdAt).toISOString(),
          updated_at: new Date(updated.updatedAt).toISOString(),
        }).catch((err) => console.error('[useTabs] bulkMoveTabs upsert:', err))
      }
    }
    setTabs((prev) => prev.map((t) => updates[t.id] ?? t))
  }, [tabs, tabCards, userId])

  const flipCard = useCallback((cardId) => {
    setFlippedCardIds((prev) => toggleFlip(prev, cardId))
  }, [])

  const isFlippedCard = useCallback((cardId) => {
    return isFlippedFn(flippedCardIds, cardId)
  }, [flippedCardIds])

  const dissolveStack = useCallback(
    async (stackId) => {
      const stack = cardsById[stackId]
      if (!stack || !isStackCard(stack)) return
      if (!activeTab) return

      const activeTabCards = tabCards
        .filter((tc) => tc.tabId === activeTab.id)
        .sort((a, b) => a.position - b.position)
      const stackTcIndex = activeTabCards.findIndex((tc) => tc.cardId === stackId)
      if (stackTcIndex === -1) return

      const withoutStack = activeTabCards.filter((tc) => tc.cardId !== stackId)
      const memberTcs = stack.config.memberIds.map((memberId) =>
        createTabCard({ tabId: activeTab.id, cardId: memberId, position: 0 }),
      )
      const newActiveTabCards = [
        ...withoutStack.slice(0, stackTcIndex),
        ...memberTcs,
        ...withoutStack.slice(stackTcIndex),
      ].map((tc, i) => ({ ...tc, position: i }))

      const otherTabCards = tabCards.filter((tc) => tc.tabId !== activeTab.id)
      setTabCards([...otherTabCards, ...newActiveTabCards])

      if (stack.location === 'none') {
        setCardsById((prev) => {
          const { [stackId]: _, ...rest } = prev
          return rest
        })
        await deleteCard(stackId)
      }

      await deleteTabCard(activeTab.id, stackId)
      await Promise.all(newActiveTabCards.map((tc) => putTabCard(tc)))
    },
    [activeTab, tabCards, cardsById],
  )

  const createStack = useCallback(
    async (memberIds, options = {}) => {
      if (!activeTab || memberIds.length < 2) return
      const stack = makeStackCard({ memberIds, title: options?.title ?? '' })

      setCardsById((prev) => ({ ...prev, [stack.id]: stack }))
      await putCard(stack)

      const activeTabCards = tabCards.filter((tc) => tc.tabId === activeTab.id)

      if (options?.insertPosition !== undefined) {
        const sorted = [...activeTabCards].sort((a, b) => a.position - b.position)
        const insertAt = Math.min(options.insertPosition, sorted.length)
        const stackTc = createTabCard({ tabId: activeTab.id, cardId: stack.id, position: 0 })
        const newActiveTabCards = [
          ...sorted.slice(0, insertAt),
          stackTc,
          ...sorted.slice(insertAt),
        ].map((tc, i) => ({ ...tc, position: i }))
        const otherTabCards = tabCards.filter((tc) => tc.tabId !== activeTab.id)
        setTabCards([...otherTabCards, ...newActiveTabCards])
        await Promise.all(newActiveTabCards.map((tc) => putTabCard(tc)))
      } else {
        const position = nextPosition(activeTabCards)
        const stackTc = createTabCard({ tabId: activeTab.id, cardId: stack.id, position })
        setTabCards((prev) => [...prev, stackTc])
        await putTabCard(stackTc)
      }

      schedulerRef.current?.scheduleSync()
      return stack.id
    },
    [activeTab, tabCards],
  )

  // Flat merge: dissolves any stacks in ids, collects all leaf card IDs, creates one flat stack.
  // Removes all selected items from the tab and inserts the new stack at the first selected position.
  const stackSelectedFlat = useCallback(
    async (ids) => {
      if (!activeTab || ids.length < 2) return

      const selectedSet = new Set(ids)
      const activeTabCards = tabCards
        .filter((tc) => tc.tabId === activeTab.id)
        .sort((a, b) => a.position - b.position)

      const firstSelectedIndex = activeTabCards.findIndex((tc) => selectedSet.has(tc.cardId))
      const insertAt = firstSelectedIndex === -1 ? activeTabCards.length : firstSelectedIndex

      const flatIds = flattenIds(ids, cardsById)
      const stackIdsToDissolve = ids.filter((id) => {
        const card = cardsById[id]
        return card && isStackCard(card)
      })

      if (flatIds.length < 2) return

      const newStack = makeStackCard({ memberIds: flatIds })
      const stackTc = createTabCard({ tabId: activeTab.id, cardId: newStack.id, position: 0 })
      const without = activeTabCards.filter((tc) => !selectedSet.has(tc.cardId))
      const newActiveTabCards = [
        ...without.slice(0, insertAt),
        stackTc,
        ...without.slice(insertAt),
      ].map((tc, i) => ({ ...tc, position: i }))
      const otherTabCards = tabCards.filter((tc) => tc.tabId !== activeTab.id)

      setCardsById((prev) => {
        const next = { ...prev, [newStack.id]: newStack }
        for (const stackId of stackIdsToDissolve) {
          if (prev[stackId]?.location === 'none') delete next[stackId]
        }
        return next
      })
      setTabCards([...otherTabCards, ...newActiveTabCards])

      await putCard(newStack)
      await Promise.all(ids.map((id) => deleteTabCard(activeTab.id, id)))
      for (const stackId of stackIdsToDissolve) {
        if (cardsById[stackId]?.location === 'none') await deleteCard(stackId)
      }
      await Promise.all(newActiveTabCards.map((tc) => putTabCard(tc)))

      schedulerRef.current?.scheduleSync()
      return newStack.id
    },
    [activeTab, tabCards, cardsById],
  )

  // Nested: moves movingId inside targetId. If target is a stack, appends moving as a member.
  // If target is a regular card, creates a new stack{target (top), moving} at target's tab position.
  // In both cases, moving is removed from the tab.
  const nestMoveCardInTarget = useCallback(
    async (movingId, targetId) => {
      if (!activeTab) return
      const movingCard = cardsById[movingId]
      const targetCard = cardsById[targetId]
      if (!movingCard || !targetCard) return

      const activeTabCards = tabCards
        .filter((tc) => tc.tabId === activeTab.id)
        .sort((a, b) => a.position - b.position)
      const otherTabCards = tabCards.filter((tc) => tc.tabId !== activeTab.id)

      if (isStackCard(targetCard)) {
        const updatedStack = addMember(targetCard, movingId)
        const newActiveTabCards = activeTabCards
          .filter((tc) => tc.cardId !== movingId)
          .map((tc, i) => ({ ...tc, position: i }))
        setCardsById((prev) => ({ ...prev, [targetId]: updatedStack }))
        setTabCards([...otherTabCards, ...newActiveTabCards])
        await putCard(updatedStack)
        await deleteTabCard(activeTab.id, movingId)
        await Promise.all(newActiveTabCards.map((tc) => putTabCard(tc)))
      } else {
        const targetIdx = activeTabCards.findIndex((tc) => tc.cardId === targetId)
        const movingIdx = activeTabCards.findIndex((tc) => tc.cardId === movingId)
        // Adjust insert position for removal of the moving card if it precedes target
        const adjustedIdx = movingIdx !== -1 && movingIdx < targetIdx ? targetIdx - 1 : targetIdx

        const newStack = makeStackCard({ memberIds: [targetId, movingId], topCardId: targetId })
        const stackTc = createTabCard({ tabId: activeTab.id, cardId: newStack.id, position: 0 })
        const withoutBoth = activeTabCards.filter(
          (tc) => tc.cardId !== targetId && tc.cardId !== movingId,
        )
        const insertAt = Math.max(0, Math.min(adjustedIdx, withoutBoth.length))
        const newActiveTabCards = [
          ...withoutBoth.slice(0, insertAt),
          stackTc,
          ...withoutBoth.slice(insertAt),
        ].map((tc, i) => ({ ...tc, position: i }))

        setCardsById((prev) => ({ ...prev, [newStack.id]: newStack }))
        setTabCards([...otherTabCards, ...newActiveTabCards])
        await putCard(newStack)
        await deleteTabCard(activeTab.id, targetId)
        await deleteTabCard(activeTab.id, movingId)
        await Promise.all(newActiveTabCards.map((tc) => putTabCard(tc)))
      }

      schedulerRef.current?.scheduleSync()
    },
    [activeTab, tabCards, cardsById],
  )

  const addToStack = useCallback(
    async (stackId, cardId) => {
      const stack = cardsById[stackId]
      if (!stack || !isStackCard(stack)) return
      const updatedStack = addMember(stack, cardId)
      setCardsById((prev) => ({ ...prev, [stackId]: updatedStack }))
      await putCard(updatedStack)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById],
  )

  const removeFromStack = useCallback(
    async (stackId, cardId) => {
      const stack = cardsById[stackId]
      if (!stack || !isStackCard(stack)) return
      const result = removeMember(stack, cardId)
      if (result === null) {
        await dissolveStack(stackId)
        return
      }
      setCardsById((prev) => ({ ...prev, [stackId]: result }))
      await putCard(result)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById, dissolveStack],
  )

  const setStackTopCard = useCallback(
    async (stackId, cardId) => {
      const stack = cardsById[stackId]
      if (!stack || !isStackCard(stack)) return
      if (!stack.config.memberIds.includes(cardId)) return
      const updatedStack = setTopCard(stack, cardId)
      setCardsById((prev) => ({ ...prev, [stackId]: updatedStack }))
      await putCard(updatedStack)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById],
  )

  const reorderStackMembers = useCallback(
    async (stackId, fromIndex, toIndex) => {
      const stack = cardsById[stackId]
      if (!stack || !isStackCard(stack)) return
      if (fromIndex === toIndex) return
      const updatedStack = reorderMembers(stack, fromIndex, toIndex)
      setCardsById((prev) => ({ ...prev, [stackId]: updatedStack }))
      await putCard(updatedStack)
      schedulerRef.current?.scheduleSync()
    },
    [cardsById],
  )

  const convertTabToStack = useCallback(
    async (tabId) => {
      const targetTabId = tabId ?? activeTabId
      const targetTabCards = tabCards
        .filter((tc) => tc.tabId === targetTabId)
        .sort((a, b) => a.position - b.position)
      if (targetTabCards.length < 2) return
      const memberIds = targetTabCards.map((tc) => tc.cardId)
      const stack = { ...makeStackCard({ memberIds }), location: 'shelf' }
      setCardsById((prev) => ({ ...prev, [stack.id]: stack }))
      await putCard(stack)
      schedulerRef.current?.scheduleSync()
      return stack.id
    },
    [activeTabId, tabCards],
  )

  const toggleCardSelection = useCallback((cardId) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(cardId)) {
        next.delete(cardId)
      } else {
        next.add(cardId)
      }
      return next
    })
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedCardIds(new Set())
  }, [])

  const selectAll = useCallback(() => {
    const ids = tabCards
      .filter((tc) => tc.tabId === activeTabId)
      .map((tc) => tc.cardId)
    setSelectedCardIds(new Set(ids))
  }, [tabCards, activeTabId])

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

  const openTabs = tabs.filter(isTabOpen)
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
    reopenSavedTab,
    renameTab,
    saveTabToShelf,
    moveTabToLibrary,
    deleteSavedTab,
    addCard,
    addPortalCard,
    addTabCard,
    addToCardsById,
    updateCard,
    removeCard,
    detachCardFromTab,
    reorder,
    fold,
    unfold,
    hide,
    unhide,
    saveToShelf,
    moveToLibrary,
    renameCard,
    moveCardToFolder,
    moveCardToShelf,
    createFolder,
    renameFolder,
    deleteFolder,
    moveFolder,
    bulkMoveCards,
    bulkDeleteCards,
    bulkMoveTabs,
    runDockPrompt,
    promptLoading,
    promptError,
    brainFeedItems,
    reindexCard,
    flipCard,
    isFlippedCard,
    selectedCardIds,
    createStack,
    stackSelectedFlat,
    nestMoveCardInTarget,
    addToStack,
    removeFromStack,
    dissolveStack,
    setStackTopCard,
    reorderStackMembers,
    convertTabToStack,
    toggleCardSelection,
    clearSelection,
    selectAll,
  }
}
