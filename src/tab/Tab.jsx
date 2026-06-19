import { Card } from '../card/Card'
import { PortalCard } from '../card/PortalCard'
import './Tab.css'

export function Tab({ entries = [], folders = [], cardsById = {}, onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide, onSaveToShelf, onMoveToLibrary, onLocate }) {
  if (entries.length === 0) {
    return (
      <div className="tab tab--empty">
        <p className="tab__empty-message">No cards yet.</p>
      </div>
    )
  }

  return (
    <ul className="tab">
      {entries.map((entry, index) => {
        const sharedProps = {
          foldState: entry.foldState,
          hiddenState: entry.hiddenState,
          onToggleFold: entry.foldState ? () => onUnfold?.(entry.card.id) : () => onFold?.(entry.card.id),
          onToggleHide: entry.hiddenState ? () => onUnhide?.(entry.card.id) : () => onHide?.(entry.card.id),
          onMoveUp: index > 0 ? () => onReorder?.(entry.card.id, entry.position - 1) : undefined,
          onMoveDown: index < entries.length - 1 ? () => onReorder?.(entry.card.id, entry.position + 1) : undefined,
          onClose: onRemove ? () => onRemove(entry.card.id) : undefined,
        }

        if (entry.card.type === 'portal') {
          const targetId = entry.card.config?.target_card_id
          const target = targetId ? cardsById[targetId] : null
          return (
            <li key={entry.card.id} className="tab__item">
              <PortalCard
                config={entry.card.config}
                cardsById={cardsById}
                {...sharedProps}
                onUpdate={target && onUpdate ? (fields) => onUpdate(target.id, fields) : undefined}
                onLocate={target && onLocate ? () => onLocate(target.id) : undefined}
              />
            </li>
          )
        }

        return (
          <li key={entry.card.id} className="tab__item">
            <Card
              title={entry.card.title}
              body={entry.card.body}
              location={entry.card.location}
              folders={folders}
              {...sharedProps}
              onUpdate={onUpdate ? (fields) => onUpdate(entry.card.id, fields) : undefined}
              onSaveToShelf={onSaveToShelf ? () => onSaveToShelf(entry.card.id) : undefined}
              onMoveToLibrary={onMoveToLibrary ? (folderId) => onMoveToLibrary(entry.card.id, folderId) : undefined}
            />
          </li>
        )
      })}
    </ul>
  )
}
