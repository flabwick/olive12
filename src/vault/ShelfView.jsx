import { findDuplicateCard } from './duplicateLogic'
import { VaultItemRow } from './VaultItemRow'
import './ShelfView.css'

export function ShelfView({
  cards = [],
  tabs = [],
  selected = new Set(),
  selectMode = false,
  highlightedCardId,
  activeItemId,
  renamingId,
  onSelect,
  onItemClick,
  onRenameCommit,
  onRenameCancel,
}) {
  if (cards.length === 0 && tabs.length === 0) {
    return <p className="vault-shelf-view__empty">Nothing in your inbox yet.</p>
  }

  return (
    <div className="vault-shelf-view">
      {cards.map((card) => {
        const isEditing = card.id === renamingId
        const checkConflict = isEditing
          ? (name) => !!findDuplicateCard(cards, name, null, card.id)
          : undefined
        return (
          <VaultItemRow
            key={card.id}
            type="card"
            title={card.title || '(untitled)'}
            highlighted={card.id === highlightedCardId}
            active={card.id === activeItemId}
            selected={selected.has(card.id)}
            selectMode={selectMode}
            editing={isEditing}
            checkConflict={checkConflict}
            onRenameCommit={(name, hasConflict) => onRenameCommit?.(card.id, 'card', name, hasConflict, null)}
            onRenameCancel={() => onRenameCancel?.(card.id, 'card')}
            onSelect={() => onSelect?.(card.id)}
            onClick={() => onItemClick?.(card, 'card')}
          />
        )
      })}
      {tabs.map((tab) => (
        <VaultItemRow
          key={tab.id}
          type="tab"
          title={tab.name || '(untitled)'}
          active={tab.id === activeItemId}
          selected={selected.has(tab.id)}
          selectMode={selectMode}
          onSelect={() => onSelect?.(tab.id)}
          onClick={() => onItemClick?.(tab, 'tab')}
        />
      ))}
    </div>
  )
}
