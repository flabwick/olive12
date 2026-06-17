import { useState } from 'react'
import { Dock } from '../tab/Dock'
import { Tab } from '../tab/Tab'
import { TransientCard } from '../tab/TransientCard'
import { FolderTree } from './FolderTree'
import { ShelfRow } from './ShelfRow'
import './VaultView.css'

export function VaultView({
  view,
  onChangeView,
  tabEntries = [],
  shelfEntries = [],
  libraryEntries = [],
  folders = [],
  onAddCard,
  onUpdateCard,
  onRemoveCard,
  onReorder,
  onFold,
  onUnfold,
  onHide,
  onUnhide,
  onSaveToShelf,
  onMoveToLibrary,
  onCreateFolder,
}) {
  const [transientOpen, setTransientOpen] = useState(false)

  function handleAddCard(fields) {
    onAddCard?.(fields)
    setTransientOpen(false)
  }

  return (
    <div className="vault-view">
      <nav className="vault-view__nav" role="tablist" aria-label="Vault views">
        {['tab', 'shelf', 'library'].map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={`vault-view__nav-btn${view === v ? ' vault-view__nav-btn--active' : ''}`}
            onClick={() => onChangeView?.(v)}
          >
            {v === 'tab' ? 'Tab' : v === 'shelf' ? 'Shelf' : 'Library'}
          </button>
        ))}
      </nav>

      {view === 'tab' && (
        <div className="vault-view__pane">
          <Tab
            entries={tabEntries}
            folders={folders}
            onReorder={onReorder}
            onUpdate={onUpdateCard}
            onRemove={onRemoveCard}
            onFold={onFold}
            onUnfold={onUnfold}
            onHide={onHide}
            onUnhide={onUnhide}
            onSaveToShelf={onSaveToShelf}
            onMoveToLibrary={onMoveToLibrary}
          />
          {transientOpen && (
            <TransientCard
              onSubmit={handleAddCard}
              onDismiss={() => setTransientOpen(false)}
            />
          )}
          <Dock onAdd={() => setTransientOpen(true)} addDisabled={transientOpen} />
        </div>
      )}

      {view === 'shelf' && (
        <div className="vault-view__pane">
          {shelfEntries.length === 0 ? (
            <p className="vault-view__empty">Shelf is empty. Save some cards from your tab.</p>
          ) : (
            <div className="vault-view__shelf-list" role="list">
              {shelfEntries.map((card) => (
                <ShelfRow
                  key={card.id}
                  card={card}
                  folders={folders}
                  onMoveToLibrary={onMoveToLibrary ? (folderId) => onMoveToLibrary(card.id, folderId) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'library' && (
        <div className="vault-view__pane">
          <FolderTree
            folders={folders}
            cards={libraryEntries}
            onCreateFolder={onCreateFolder}
          />
        </div>
      )}
    </div>
  )
}
