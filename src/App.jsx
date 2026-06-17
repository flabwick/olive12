import { useState } from 'react'
import { Dock } from './tab/Dock'
import { Tab } from './tab/Tab'
import { TransientCard } from './tab/TransientCard'
import { Sidebar } from './layout/Sidebar'
import { useTabs } from './tab/useTabs'
import './App.css'

function App() {
  const {
    entries,
    shelfEntries,
    libraryEntries,
    folders,
    addCard,
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
  } = useTabs()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [vaultView, setVaultView] = useState('shelf')
  const [transientOpen, setTransientOpen] = useState(false)

  function handleAddCard(fields) {
    addCard(fields)
    setTransientOpen(false)
  }

  return (
    <div className="app-shell">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        vaultView={vaultView}
        onChangeVaultView={setVaultView}
        shelfEntries={shelfEntries}
        libraryEntries={libraryEntries}
        folders={folders}
        onMoveToLibrary={moveToLibrary}
        onCreateFolder={createFolder}
      />

      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="app-shell__main">
        <header className="app-shell__topbar">
          <button
            type="button"
            className="app-shell__sidebar-toggle"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            ☰
          </button>
          <span className="app-shell__topbar-brand">olive</span>
        </header>

        <div className="app-shell__content">
          <Tab
            entries={entries}
            folders={folders}
            onReorder={reorder}
            onUpdate={updateCard}
            onRemove={removeCard}
            onFold={fold}
            onUnfold={unfold}
            onHide={hide}
            onUnhide={unhide}
            onSaveToShelf={saveToShelf}
            onMoveToLibrary={moveToLibrary}
          />
          {transientOpen && (
            <TransientCard
              onSubmit={handleAddCard}
              onDismiss={() => setTransientOpen(false)}
            />
          )}
          <Dock onAdd={() => setTransientOpen(true)} addDisabled={transientOpen} />
        </div>
      </div>
    </div>
  )
}

export default App
