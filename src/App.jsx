import { useEffect, useRef, useState } from 'react'
import { AuthForm } from './auth/AuthForm'
import { collectDescendantIds } from './folder/createFolder'
import { DeleteFolderModal } from './vault/DeleteFolderModal'
import { DuplicateConflictModal } from './vault/DuplicateConflictModal'
import { findDuplicateCard, findDuplicateFolder } from './vault/duplicateLogic'
import { useRichTextEditorContext, RichTextEditorProvider } from './card/RichTextEditorContext'
import { EmbedActionsProvider, EmbedEntriesProvider } from './card/EmbedEntriesContext'
import { createCard } from './card/createCard'
import { createFileCard } from './card/createFileCard'
import { putCard } from './card/cardStorage'
import { EmbedSourcePanel } from './card/EmbedSourcePanel'
import { IndexDebugPanel } from './debug/IndexDebugPanel'
import { FolderPanel } from './layout/FolderPanel'
import { supabase } from './lib/supabaseClient'
import { Dock } from './tab/Dock'
import { DockCardPanel } from './tab/DockCardPanel'
import { Tab } from './tab/Tab'
import { TabHeader } from './tab/TabHeader'
import { TabSwitcher } from './tab/TabSwitcher'
import { useDock } from './tab/useDock'
import { isTabOpen } from './tab/createTab'
import { useTabs } from './tab/useTabs'
import './dev/seedData'
import './App.css'

function AppShell({ userId }) {
  const { activeEditor, activeCardId: activeEditorCardId, activeSurface } = useRichTextEditorContext()

  const {
    tab,
    tabs,
    openTabs,
    activeTabId,
    entries,
    shelfEntries,
    libraryEntries,
    shelfTabs,
    libraryTabs,
    folders,
    switchTab,
    addTab,
    removeTab,
    reopenSavedTab,
    renameTab,
    saveTabToShelf,
    moveTabToLibrary,
    addCard,
    addTabCard,
    addToCardsById,
    addPortalCard,
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
    deleteSavedTab,
    bulkMoveCards,
    bulkDeleteCards,
    bulkMoveTabs,
    runAI,
    allTabCards,
    cardsById,
    brainFeedItems,
    reindexCard,
    flipCard,
    isFlippedCard,
    selectedCardIds,
    createStack,
    stackSelectedFlat,
    nestMoveCardInTarget,
    addToStack,
    dissolveStack,
    setStackTopCard,
    reorderStackMembers,
    toggleCardSelection,
    clearSelection,
  } = useTabs({ userId })

  const embedEditorRef = useRef(null)
  const savedEditorRef = useRef(null)
  const [folderPanelOpen, setFolderPanelOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [aiEntryPoint, setAiEntryPoint] = useState(null)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false)
  const [indexDebugOpen, setIndexDebugOpen] = useState(false)
  const [vaultTab, setVaultTab] = useState('shelf')
  const [highlightedCardId, setHighlightedCardId] = useState(null)
  const [selectedVaultItem, setSelectedVaultItem] = useState(null)
  const [pickingFolder, setPickingFolder] = useState(false)
  const [deleteFolderModal, setDeleteFolderModal] = useState(null)
  const [renamingItemId, setRenamingItemId] = useState(null)
  const [newItemPendingId, setNewItemPendingId] = useState(null)
  const [moveConflict, setMoveConflict] = useState(null)
  const [moveTarget, setMoveTarget] = useState(null)
  const [movingSelection, setMovingSelection] = useState(false)
  const [moveCardId, setMoveCardId] = useState(null)

  const {
    dockCardEntries,
    activeDockCardId,
    dockState,
    openDockCard,
    closeDockCard,
    addToDock,
    removeFromDock,
    createAndPinCard,
    moveDockCardToTab,
  } = useDock({ cardsById, activeEditorCardId, activeSurface, selectedCardCount: selectedCardIds.size, moveCardId })

  function handleOpenAsPortal(cardId) {
    addPortalCard(cardId)
    setFolderPanelOpen(false)
  }

  function handleOpenSavedTab(tabId) {
    switchTab(tabId)
    setFolderPanelOpen(false)
  }

  function handleLocate(targetCardId) {
    const card = cardsById[targetCardId]
    if (!card) return
    setVaultTab(card.location === 'library' ? 'library' : 'shelf')
    setHighlightedCardId(targetCardId)
    setFolderPanelOpen(true)
  }

  function handleMoveTabToLibrary(tabId) {
    moveTabToLibrary(tabId, null)
  }

  function handleFolderOpen() {
    closeDockCard()
    setFolderPanelOpen((v) => {
      if (v) {
        setSelectedVaultItem(null)
        setPickingFolder(false)
      }
      return !v
    })
  }

  function handleSelectVaultItem(item, type) {
    setSelectedVaultItem({ item, type })
  }

  function handleClearVaultItem() {
    setSelectedVaultItem(null)
  }

  function handleVaultSwitchToTab(tabId) {
    const t = tabs.find((tab) => tab.id === tabId)
    if (t && !isTabOpen(t)) {
      reopenSavedTab(tabId)
    } else {
      switchTab(tabId)
    }
    setFolderPanelOpen(false)
    setSelectedVaultItem(null)
  }

  function handleVaultTabChange(tab) {
    setVaultTab(tab)
    if (pickingFolder) {
      setMoveTarget(null)
    } else {
      setSelectedVaultItem(null)
    }
  }

  async function handleVaultNewCard() {
    const card = { ...createCard({ title: '', body: '' }), location: 'shelf' }
    await putCard(card)
    addToCardsById(card)
  }

  async function handleUploadCard(file) {
    const card = createFileCard(file)
    await putCard(card)
    addToCardsById(card)
    await addToDock(card.id)
  }

  async function handleVaultNewFolder() {
    setFolderPanelOpen(true)
    setVaultTab('library')
    const folder = await createFolder()
    setRenamingItemId(folder.id)
    setNewItemPendingId(folder.id)
  }

  function handleVaultPickFolder() {
    setPickingFolder(true)
    setFolderPanelOpen(true)
    setMoveTarget(null)
  }

  function handlePickFolderCancel() {
    setPickingFolder(false)
    setMovingSelection(false)
    setMoveTarget(null)
  }

  function handleFolderPickToggle(folder) {
    setMoveTarget((prev) => (prev?.id === folder.id ? null : { id: folder.id, name: folder.name }))
  }

  async function handleCreateStackFromSelection() {
    if (selectedCardIds.size < 2) return
    await stackSelectedFlat(Array.from(selectedCardIds))
    clearSelection()
    setMoveCardId(null)
  }

  async function handleNestInTarget(movingId, targetId) {
    await nestMoveCardInTarget(movingId, targetId)
    clearSelection()
    setMoveCardId(null)
  }

  async function handleAddToStack(stackId, cardId) {
    await addToStack(stackId, cardId)
    await detachCardFromTab(cardId)
    clearSelection()
    setMoveCardId(null)
  }

  function handleToggleCardSelection(cardId) {
    toggleCardSelection(cardId)
    setMoveCardId(null)
  }

  function handleClearSelection() {
    clearSelection()
    setMoveCardId(null)
  }

  function handleMoveSelection() {
    if (selectedCardIds.size === 0) return
    setMoveCardId(null)
    setMovingSelection(true)
    setPickingFolder(true)
    setFolderPanelOpen(true)
    setVaultTab('library')
  }

  const singleSelectedId = selectedCardIds.size === 1 ? selectedCardIds.values().next().value : null
  const singleSelectedCard = singleSelectedId ? cardsById[singleSelectedId] : null
  const movingCard = moveCardId ? cardsById[moveCardId] : null
  const dockActionCardId = moveCardId ?? singleSelectedId

  function handleMoveToDock(cardId) {
    addToDock(cardId)
    detachCardFromTab(cardId)
  }

  function handleDockFromMove() {
    if (!dockActionCardId) return
    addToDock(dockActionCardId)
    detachCardFromTab(dockActionCardId)
    handleClearSelection()
    setMoveCardId(null)
  }

  function handleConfirmMove() {
    if (movingSelection) {
      const folderId = moveTarget?.id ?? null
      bulkMoveCards(Array.from(selectedCardIds), folderId)
      clearSelection()
      setMovingSelection(false)
      setPickingFolder(false)
      setMoveTarget(null)
      setFolderPanelOpen(false)
      return
    }
    if (!selectedVaultItem) return
    const { item, type } = selectedVaultItem
    if (vaultTab === 'shelf' && type === 'card') {
      moveCardToShelf(item.id)
      setPickingFolder(false)
      setSelectedVaultItem(null)
      setMoveTarget(null)
    } else {
      const folderId = vaultTab !== 'shelf' ? (moveTarget?.id ?? null) : null
      handleVaultMoveToFolder(folderId)
      setMoveTarget(null)
    }
  }

  function handleVaultRenameCard(cardId, title) {
    renameCard(cardId, title)
    if (selectedVaultItem?.item?.id === cardId) {
      setSelectedVaultItem((prev) => ({ ...prev, item: { ...prev.item, title } }))
    }
  }

  function handleVaultRenameFolder(folderId, name) {
    renameFolder(folderId, name)
    if (selectedVaultItem?.item?.id === folderId) {
      setSelectedVaultItem((prev) => ({ ...prev, item: { ...prev.item, name } }))
    }
  }

  function handleVaultStartInlineRename(itemId, itemType) {
    setRenamingItemId(itemId)
    setFolderPanelOpen(true)
    if (itemType === 'folder') setVaultTab('library')
  }

  function handleInlineRenameCommit(itemId, itemType, newName, opts = {}) {
    if (itemType === 'folder') {
      if (opts.replaceId) deleteFolder(opts.replaceId, 'delete-contents')
      renameFolder(itemId, newName)
    } else if (itemType === 'card') {
      if (opts.replaceId) removeCard(opts.replaceId)
      renameCard(itemId, newName)
    }
    setRenamingItemId(null)
    setNewItemPendingId(null)
  }

  function handleInlineRenameCancel(itemId) {
    if (itemId === newItemPendingId) {
      deleteFolder(itemId, 'delete-contents')
    }
    setRenamingItemId(null)
    setNewItemPendingId(null)
  }

  function handleVaultDeleteCard(cardId) {
    removeCard(cardId)
    setSelectedVaultItem(null)
  }

  function handleVaultDeleteFolderRequest(folderId) {
    const folder = folders.find((f) => f.id === folderId)
    if (!folder) return
    const descendantIds = collectDescendantIds(folders, folderId)
    const allFolderIds = new Set([folderId, ...descendantIds])
    const cardCount = libraryEntries.filter((c) => allFolderIds.has(c.folderId)).length
    const folderCount = descendantIds.length
    if (cardCount + folderCount === 0) {
      deleteFolder(folderId, 'delete-contents')
      setSelectedVaultItem(null)
    } else {
      setDeleteFolderModal({ folderId, name: folder.name, cardCount, folderCount })
    }
  }

  function handleConfirmDeleteFolder() {
    if (!deleteFolderModal) return
    deleteFolder(deleteFolderModal.folderId, 'delete-contents')
    setDeleteFolderModal(null)
    setSelectedVaultItem(null)
  }

  function handleVaultMoveToFolder(folderId) {
    if (!selectedVaultItem) return
    const { item, type } = selectedVaultItem
    if (type === 'card') {
      const allCards = [...shelfEntries, ...libraryEntries]
      const conflict = findDuplicateCard(allCards, item.title, folderId, item.id)
      if (conflict) {
        setMoveConflict({ itemId: item.id, itemLocation: item.location, destFolderId: folderId, conflictId: conflict.id, conflictName: item.title })
        return
      }
      if (item.location === 'library') {
        moveCardToFolder(item.id, folderId)
      } else {
        moveToLibrary(item.id, folderId)
      }
    } else if (type === 'tab') {
      moveTabToLibrary(item.id, folderId)
    } else if (type === 'folder') {
      moveFolder(item.id, folderId)
    }
    setPickingFolder(false)
    setSelectedVaultItem(null)
  }

  function handleMoveConflictReplace() {
    if (!moveConflict) return
    const { itemId, itemLocation, destFolderId, conflictId } = moveConflict
    removeCard(conflictId)
    if (itemLocation === 'library') {
      moveCardToFolder(itemId, destFolderId)
    } else {
      moveToLibrary(itemId, destFolderId)
    }
    setPickingFolder(false)
    setSelectedVaultItem(null)
    setMoveConflict(null)
    setMoveTarget(null)
  }

  function handleMoveConflictKeepBoth() {
    if (!moveConflict) return
    const { itemId, itemLocation, destFolderId } = moveConflict
    if (itemLocation === 'library') {
      moveCardToFolder(itemId, destFolderId)
    } else {
      moveToLibrary(itemId, destFolderId)
    }
    setPickingFolder(false)
    setSelectedVaultItem(null)
    setMoveConflict(null)
    setMoveTarget(null)
  }

  function handleMoveConflictCancel() {
    setPickingFolder(false)
    setMoveConflict(null)
    setMoveTarget(null)
  }

  function handleVaultOpenInDock(cardId) {
    addToDock(cardId)
    setFolderPanelOpen(false)
    setSelectedVaultItem(null)
    openDockCard(cardId)
  }

  function handleOpenDockCard(cardId) {
    setFolderPanelOpen(false)
    setSelectedVaultItem(null)
    openDockCard(cardId)
  }

  function handleAddDockCard() {
    setFolderPanelOpen(false)
    setSelectedVaultItem(null)
    createAndPinCard(addToCardsById)
  }

  function handleOpenAIPrompt(entryPoint) {
    if (entryPoint === 'DOCK_PROMPT') {
      savedEditorRef.current = activeEditor
    }
    setAiEntryPoint(entryPoint)
    setPromptOpen(true)
  }

  function handlePromptSubmit(text) {
    const entryPoint = aiEntryPoint
    const editor = savedEditorRef.current
    savedEditorRef.current = null
    setPromptOpen(false)
    setAiEntryPoint(null)
    if (entryPoint === 'DOCK_PROMPT') {
      runAI({
        entryPoint: 'DOCK_PROMPT',
        userPrompt: text,
        onCardCreated: (cardId) => {
          editor?.chain().focus().insertContent({ type: 'embeddedCard', attrs: { cardId } }).run()
        },
      })
    } else {
      runAI({ entryPoint, userPrompt: text })
    }
  }

  function handlePromptDismiss() {
    const editor = savedEditorRef.current
    savedEditorRef.current = null
    setPromptOpen(false)
    setAiEntryPoint(null)
    setTimeout(() => editor?.commands.focus(), 0)
  }

  function handleEmbedOpen() {
    embedEditorRef.current = activeEditor
    setEmbedOpen((v) => !v)
  }

  function handleEmbedSelect(cardId) {
    const editor = embedEditorRef.current
    if (editor) {
      editor.chain().focus().insertContent({ type: 'embeddedCard', attrs: { cardId } }).run()
    }
    embedEditorRef.current = null
    setEmbedOpen(false)
  }

  async function handleEmbedCreate() {
    const card = createCard({ title: '', body: '' })
    await putCard(card)
    addToCardsById(card)
    const editor = embedEditorRef.current
    if (editor) {
      editor.chain().focus().insertContent({ type: 'embeddedCard', attrs: { cardId: card.id } }).run()
    }
    embedEditorRef.current = null
    setEmbedOpen(false)
  }

  function handleSettings() {
    setFolderPanelOpen(false)
    setIndexDebugOpen((v) => !v)
  }

  function handleTabOverview() {
    setFolderPanelOpen(false)
    setPromptOpen(false)
    setTabSwitcherOpen(true)
  }

  return (
    <EmbedActionsProvider
      onSaveToShelf={saveToShelf}
      onMoveToDock={addToDock}
      onMoveToTab={addTabCard}
      onUpdate={updateCard}
    >
    <EmbedEntriesProvider entries={Object.values(cardsById)}>
    <div className="app-shell">
      <div className="app-shell__content">
        {tab && (
          <TabHeader
            name={tab.name}
            savedLocation={tab.savedLocation}
            onRename={(name) => renameTab(tab.id, name)}
            onSaveToShelf={tab.savedLocation === 'none' ? () => saveTabToShelf(tab.id) : undefined}
            onMoveToLibrary={tab.savedLocation === 'shelf' ? () => moveTabToLibrary(tab.id) : undefined}
            onTabOverview={handleTabOverview}
          />
        )}
        <Tab
          entries={entries}
          folders={folders}
          cardsById={cardsById}
          onReorder={reorder}
          onUpdate={updateCard}
          onRemove={removeCard}
          onFold={fold}
          onUnfold={unfold}
          onHide={hide}
          onUnhide={unhide}
          onSaveToShelf={saveToShelf}
          onMoveToLibrary={moveToLibrary}
          onLocate={handleLocate}
          flipCard={flipCard}
          isFlipped={isFlippedCard}
          selectedCardIds={selectedCardIds}
          onToggleSelect={handleToggleCardSelection}
          onAddToStack={handleAddToStack}
          onNestInTarget={handleNestInTarget}
          moveCardId={moveCardId}
          onExitMoveMode={() => setMoveCardId(null)}
          setStackTopCard={setStackTopCard}
          onReorderStackMember={reorderStackMembers}
          onDissolveStack={dissolveStack}
          onAddCard={addCard}
          onMoveToDock={handleMoveToDock}
          onAIPrompt={() => handleOpenAIPrompt('TAB_NEW_CARD')}
        />
      </div>
      <div className="app-shell__dock-area">
        {folderPanelOpen && (
          <FolderPanel
            shelfEntries={shelfEntries}
            libraryEntries={libraryEntries}
            shelfTabs={shelfTabs}
            libraryTabs={libraryTabs}
            folders={folders}
            onMoveToLibrary={moveToLibrary}
            onMoveTabToLibrary={handleMoveTabToLibrary}
            onCreateFolder={createFolder}
            onClose={() => { setFolderPanelOpen(false); setSelectedVaultItem(null) }}
            onOpenAsPortal={handleOpenAsPortal}
            onOpenTab={handleOpenSavedTab}
            activeTab={vaultTab}
            onTabChange={handleVaultTabChange}
            highlightedCardId={highlightedCardId}
            activeVaultItemId={pickingFolder ? (moveTarget?.id ?? null) : (selectedVaultItem?.item?.id ?? null)}
            onSelectVaultItem={handleSelectVaultItem}
            pickFolderMode={pickingFolder}
            onFolderPicked={handleFolderPickToggle}
            brainFeedItems={brainFeedItems}
            onReindex={reindexCard}
            moveCardToFolder={moveCardToFolder}
            moveFolder={moveFolder}
            bulkMoveCards={bulkMoveCards}
            bulkDeleteCards={bulkDeleteCards}
            bulkMoveTabs={bulkMoveTabs}
            renamingItemId={renamingItemId}
            onInlineRenameCommit={handleInlineRenameCommit}
            onInlineRenameCancel={handleInlineRenameCancel}
          />
        )}
        {embedOpen && (
          <EmbedSourcePanel
            entries={[...shelfEntries, ...libraryEntries]}
            onSelect={handleEmbedSelect}
            onClose={() => setEmbedOpen(false)}
            onCreateNew={handleEmbedCreate}
          />
        )}
        {activeDockCardId && cardsById[activeDockCardId] && (
          <DockCardPanel
            card={cardsById[activeDockCardId]}
            cardId={activeDockCardId}
            onClose={() => removeFromDock(activeDockCardId)}
            onUpdate={updateCard}
            onMoveToTab={() => moveDockCardToTab(activeDockCardId, addTabCard)}
          />
        )}
        {deleteFolderModal && (
          <DeleteFolderModal
            name={deleteFolderModal.name}
            cardCount={deleteFolderModal.cardCount}
            folderCount={deleteFolderModal.folderCount}
            onConfirm={handleConfirmDeleteFolder}
            onCancel={() => setDeleteFolderModal(null)}
          />
        )}
        {moveConflict && (
          <DuplicateConflictModal
            itemType="card"
            conflictName={moveConflict.conflictName}
            onReplace={handleMoveConflictReplace}
            onKeepBoth={handleMoveConflictKeepBoth}
            onCancel={handleMoveConflictCancel}
          />
        )}
        <IndexDebugPanel open={indexDebugOpen} onClose={() => setIndexDebugOpen(false)} />
        <Dock
          dockState={dockState}
          dockCardEntries={dockCardEntries}
          activeDockCardId={activeDockCardId}
          onAddDockCard={handleAddDockCard}
          onOpenDockCard={handleOpenDockCard}
          onCloseDockCard={closeDockCard}
          onFolderOpen={handleFolderOpen}
          onSettings={handleSettings}
          onEmbedOpen={handleEmbedOpen}
          onAIPrompt={handleOpenAIPrompt}
          promptOpen={promptOpen}
          onPromptSubmit={handlePromptSubmit}
          onPromptDismiss={handlePromptDismiss}
          vaultOpen={folderPanelOpen}
          vaultTab={vaultTab}
          onVaultTabChange={handleVaultTabChange}
          onVaultNewCard={handleVaultNewCard}
          onVaultNewFolder={handleVaultNewFolder}
          selectedVaultItem={selectedVaultItem}
          onClearVaultItem={handleClearVaultItem}
          onVaultAddToDock={handleVaultOpenInDock}
          onUploadFile={handleUploadCard}
          onVaultStartInlineRename={handleVaultStartInlineRename}
          onVaultSwitchToTab={handleVaultSwitchToTab}
          onVaultDeleteTab={deleteSavedTab}
          onVaultDeleteCard={handleVaultDeleteCard}
          onVaultDeleteFolderRequest={handleVaultDeleteFolderRequest}
          pickingFolder={pickingFolder}
          onVaultPickFolder={handleVaultPickFolder}
          onVaultPickFolderCancel={handlePickFolderCancel}
          moveTarget={moveTarget}
          onConfirmMove={handleConfirmMove}
          selectedCardCount={selectedCardIds.size}
          selectedCardTitle={singleSelectedCard?.title ?? ''}
          moveCardTitle={movingCard?.title ?? ''}
          onEnterMoveMode={singleSelectedId ? () => setMoveCardId(singleSelectedId) : undefined}
          onExitMoveMode={() => setMoveCardId(null)}
          onDockFromMove={dockActionCardId ? handleDockFromMove : undefined}
          onClearSelection={handleClearSelection}
          onCreateStack={selectedCardIds.size >= 2 ? handleCreateStackFromSelection : undefined}
        />
      </div>
      {tabSwitcherOpen && (
        <TabSwitcher
          tabs={openTabs}
          activeTabId={activeTabId}
          tabEntries={Object.fromEntries(
            openTabs.map((t) => [
              t.id,
              allTabCards
                .filter((tc) => tc.tabId === t.id)
                .map((tc) => cardsById[tc.cardId])
                .filter(Boolean),
            ])
          )}
          onSwitch={(tabId) => { switchTab(tabId); setTabSwitcherOpen(false) }}
          onClose={() => setTabSwitcherOpen(false)}
          onAdd={addTab}
          onRemoveTab={removeTab}
          onSaveTab={saveTabToShelf}
        />
      )}
    </div>
    </EmbedEntriesProvider>
    </EmbedActionsProvider>
  )
}

function App() {
  const [sessionChecked, setSessionChecked] = useState(false)
  const [userId, setUserId] = useState(null)
  const [authError, setAuthError] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user?.id ?? null)
      setSessionChecked(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignIn(email, password) {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    setAuthLoading(false)
  }

  async function handleSignUp(email, password) {
    setAuthLoading(true)
    setAuthError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setAuthError(error.message)
    else setAuthError('Check your email to confirm your account.')
    setAuthLoading(false)
  }

  if (!sessionChecked) return null

  if (!userId) {
    return (
      <AuthForm
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        error={authError}
        loading={authLoading}
      />
    )
  }

  return (
    <RichTextEditorProvider>
      <AppShell userId={userId} />
    </RichTextEditorProvider>
  )
}

export default App
