import { useState } from 'react'
import { Dock } from './tab/Dock'
import { Tab } from './tab/Tab'
import { TransientCard } from './tab/TransientCard'
import { FolderPanel } from './layout/FolderPanel'
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

  const [folderPanelOpen, setFolderPanelOpen] = useState(false)
  const [transientOpen, setTransientOpen] = useState(false)

  function handleAddCard(fields) {
    addCard(fields)
    setTransientOpen(false)
  }

  return (
    <div className="app-shell">
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
      </div>
      <div className="app-shell__dock-area">
        {folderPanelOpen && (
          <FolderPanel
            shelfEntries={shelfEntries}
            libraryEntries={libraryEntries}
            folders={folders}
            onMoveToLibrary={moveToLibrary}
            onCreateFolder={createFolder}
            onClose={() => setFolderPanelOpen(false)}
          />
        )}
        <Dock
          onAdd={() => setTransientOpen(true)}
          addDisabled={transientOpen}
          onFolder={() => setFolderPanelOpen((v) => !v)}
        />
      </div>
    </div>
  )
}

export default App
