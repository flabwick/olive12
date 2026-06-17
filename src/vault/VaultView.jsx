import { useState } from 'react'
import { Card } from '../card/Card'
import { Dock } from '../tab/Dock'
import { Tab } from '../tab/Tab'
import { TransientCard } from '../tab/TransientCard'
import './VaultView.css'

export function VaultView({
  view,
  onChangeView,
  tabEntries = [],
  shelfEntries = [],
  libraryEntries = [],
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
            <ul className="vault-view__list">
              {shelfEntries.map((card) => (
                <li key={card.id} className="vault-view__item">
                  <Card
                    title={card.title}
                    body={card.body}
                    location={card.location}
                    onUpdate={onUpdateCard ? (fields) => onUpdateCard(card.id, fields) : undefined}
                    onMoveToLibrary={onMoveToLibrary ? () => onMoveToLibrary(card.id) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {view === 'library' && (
        <div className="vault-view__pane">
          {libraryEntries.length === 0 ? (
            <p className="vault-view__empty">{"Library is empty. Promote cards here when they're ready."}</p>
          ) : (
            <ul className="vault-view__list">
              {libraryEntries.map((card) => (
                <li key={card.id} className="vault-view__item">
                  <Card
                    title={card.title}
                    body={card.body}
                    location={card.location}
                    onUpdate={onUpdateCard ? (fields) => onUpdateCard(card.id, fields) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
