import { useState } from 'react'
import { VaultView } from './vault/VaultView'
import { useTabs } from './tab/useTabs'
import './App.css'

function App() {
  const {
    entries,
    shelfEntries,
    libraryEntries,
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
      />
    </div>
  )
}

export default App
