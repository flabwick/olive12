import { useState } from 'react'
import { VaultView } from './vault/VaultView'
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
  const [view, setView] = useState('tab')

  return (
    <div className="app-shell">
      <VaultView
        view={view}
        onChangeView={setView}
        tabEntries={entries}
        shelfEntries={shelfEntries}
        libraryEntries={libraryEntries}
        folders={folders}
        onAddCard={addCard}
        onUpdateCard={updateCard}
        onRemoveCard={removeCard}
        onReorder={reorder}
        onFold={fold}
        onUnfold={unfold}
        onHide={hide}
        onUnhide={unhide}
        onSaveToShelf={saveToShelf}
        onMoveToLibrary={moveToLibrary}
        onCreateFolder={createFolder}
      />
    </div>
  )
}

export default App
