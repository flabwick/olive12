import { useState } from 'react'
import { Dock } from './tab/Dock'
import { Tab } from './tab/Tab'
import { TransientCard } from './tab/TransientCard'
import { useTabs } from './tab/useTabs'
import './App.css'

function App() {
  const { entries, addCard, updateCard, removeCard, reorder, fold, unfold, hide, unhide, saveToShelf, moveToLibrary } = useTabs()
  const [transientOpen, setTransientOpen] = useState(false)

  function handleAddCard({ title, body }) {
    addCard({ title, body })
    setTransientOpen(false)
  }

  return (
    <div className="app-shell">
      <div className="app-shell__feed">
        <Tab
          entries={entries}
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
      <Dock onAdd={() => setTransientOpen(true)} addDisabled={transientOpen} />
    </div>
  )
}

export default App
