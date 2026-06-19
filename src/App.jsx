import { useEffect, useState } from 'react'
import { AuthForm } from './auth/AuthForm'
import { FolderPanel } from './layout/FolderPanel'
import { supabase } from './lib/supabaseClient'
import { Dock } from './tab/Dock'
import { DockPrompt } from './tab/DockPrompt'
import { Tab } from './tab/Tab'
import { TabHeader } from './tab/TabHeader'
import { TabSwitcher } from './tab/TabSwitcher'
import { TransientCard } from './tab/TransientCard'
import { useTabs } from './tab/useTabs'
import './App.css'

function AppShell({ userId }) {
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
    allTabCards,
    cardsById,
  } = useTabs({ userId })

  const [folderPanelOpen, setFolderPanelOpen] = useState(false)
  const [transientOpen, setTransientOpen] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)
  const [tabSwitcherOpen, setTabSwitcherOpen] = useState(false)
  const [vaultInitialTab, setVaultInitialTab] = useState('shelf')
  const [highlightedCardId, setHighlightedCardId] = useState(null)

  function handleAddCard(fields) {
    addCard(fields)
    setTransientOpen(false)
  }

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

  function handleSubmitPortal(cardId) {
    addPortalCard(cardId)
    setTransientOpen(false)
  }

  function handleFolder() {
    setPromptOpen(false)
    setFolderPanelOpen((v) => !v)
  }

  function handlePromptToggle() {
    setFolderPanelOpen(false)
    setPromptOpen((v) => !v)
  }

  async function handlePromptSubmit(text) {
    console.log('[app] handlePromptSubmit fired, text:', JSON.stringify(text))
    const ok = await runDockPrompt(text)
    console.log('[app] runDockPrompt returned:', ok)
    if (ok) setPromptOpen(false)
  }

  function handleTabOverview() {
    setFolderPanelOpen(false)
    setPromptOpen(false)
    setTabSwitcherOpen(true)
  }

  return (
    <div className="app-shell">
      <div className="app-shell__content">
        {tab && (
          <TabHeader
            name={tab.name}
            savedLocation={tab.savedLocation}
            onRename={(name) => renameTab(tab.id, name)}
            onSaveToShelf={tab.savedLocation === 'none' ? () => saveTabToShelf(tab.id) : undefined}
            onMoveToLibrary={tab.savedLocation === 'shelf' ? () => moveTabToLibrary(tab.id) : undefined}
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
        />
        {transientOpen && (
          <TransientCard
            onSubmit={handleAddCard}
            onDismiss={() => setTransientOpen(false)}
            onSubmitPortal={handleSubmitPortal}
            shelfEntries={shelfEntries}
            libraryEntries={libraryEntries}
          />
        )}
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
        <Dock
          onAdd={() => setTransientOpen(true)}
          addDisabled={transientOpen}
          onFolder={handleFolder}
          onPrompt={handlePromptToggle}
          promptDisabled={promptLoading}
          onTabOverview={handleTabOverview}
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

  return <AppShell userId={userId} />
}

export default App
