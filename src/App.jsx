import { useEffect, useRef, useState } from 'react'
import { AuthForm } from './auth/AuthForm'
import { useRichTextEditorContext, RichTextEditorProvider } from './card/RichTextEditorContext'
import { EmbedActionsProvider, EmbedEntriesProvider } from './card/EmbedEntriesContext'
import { createCard } from './card/createCard'
import { putCard } from './card/cardStorage'
import { EmbedSourcePanel } from './card/EmbedSourcePanel'
import { IndexDebugPanel } from './debug/IndexDebugPanel'
import { FolderPanel } from './layout/FolderPanel'
import { supabase } from './lib/supabaseClient'
import { Dock } from './tab/Dock'
import { DockCardPanel } from './tab/DockCardPanel'
import { DockPrompt } from './prompt/DockPrompt'
import { Tab } from './tab/Tab'
import { TabHeader } from './tab/TabHeader'
import { TabSwitcher } from './tab/TabSwitcher'
import { useDock } from './tab/useDock'
import { useTabs } from './tab/useTabs'
import './App.css'

function AppShell({ userId }) {
  const { activeEditor, activeCardId: activeEditorCardId, activeSurface } = useRichTextEditorContext()

  const {
    tab,
    tabs,
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
    renameTab,
    saveTabToShelf,
    moveTabToLibrary,
    addTabCard,
    addToCardsById,
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
    allTabCards,
    cardsById,
    brainFeedItems,
    reindexCard,
    flipCard,
    isFlippedCard,
  } = useTabs({ userId })

  const {
    dockCardEntries,
    activeDockCardId,
    dockState,
    openDockCard,
    closeDockCard,
    addToDock,
    createAndPinCard,
    moveDockCardToTab,
  } = useDock({ cardsById, activeEditorCardId, activeSurface })

  const embedEditorRef = useRef(null)
  const [folderPanelOpen, setFolderPanelOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [embedOpen, setEmbedOpen] = useState(false)
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false)
  const [indexDebugOpen, setIndexDebugOpen] = useState(false)
  const [lightningActive, setLightningActive] = useState(false)
  const [vaultInitialTab, setVaultInitialTab] = useState('shelf')
  const [highlightedCardId, setHighlightedCardId] = useState(null)

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
    setVaultInitialTab(card.location === 'library' ? 'library' : 'shelf')
    setHighlightedCardId(targetCardId)
    setFolderPanelOpen(true)
  }

  function handleMoveTabToLibrary(tabId) {
    moveTabToLibrary(tabId, null)
  }

  function handleFolderOpen() {
    closeDockCard()
    setFolderPanelOpen((v) => !v)
  }

  async function handlePromptSubmit(text) {
    const ok = await runDockPrompt(text)
    if (ok) setPromptOpen(false)
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
    <EmbedActionsProvider onSaveToShelf={saveToShelf}>
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
            onClose={() => setFolderPanelOpen(false)}
            onOpenAsPortal={handleOpenAsPortal}
            onOpenTab={handleOpenSavedTab}
            initialTab={vaultInitialTab}
            highlightedCardId={highlightedCardId}
            brainFeedItems={brainFeedItems}
            onReindex={reindexCard}
          />
        )}
        {promptOpen && (
          <DockPrompt
            onSubmit={handlePromptSubmit}
            onDismiss={() => setPromptOpen(false)}
            loading={promptLoading}
            error={promptError}
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
            onClose={closeDockCard}
            onUpdate={updateCard}
          />
        )}
        <IndexDebugPanel open={indexDebugOpen} onClose={() => setIndexDebugOpen(false)} />
        <Dock
          dockState={dockState}
          dockCardEntries={dockCardEntries}
          activeDockCardId={activeDockCardId}
          onAddDockCard={() => createAndPinCard(addToCardsById)}
          onOpenDockCard={openDockCard}
          onFolderOpen={handleFolderOpen}
          onSettings={handleSettings}
          onMoveDockCardToTab={() => moveDockCardToTab(activeDockCardId, addTabCard)}
          onMoveToDock={() => activeEditorCardId && addToDock(activeEditorCardId)}
          onEmbedOpen={handleEmbedOpen}
          lightningActive={lightningActive}
          onLightningToggle={() => setLightningActive((v) => !v)}
        />
      </div>
      {tabSwitcherOpen && (
        <TabSwitcher
          tabs={tabs}
          activeTabId={activeTabId}
          tabEntries={Object.fromEntries(
            tabs.map((t) => [
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
