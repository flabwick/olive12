import { Card } from '../card/Card'
import './Tab.css'

export function Tab({ entries = [], onReorder, onUpdate, onRemove, onFold, onUnfold, onHide, onUnhide }) {
  if (entries.length === 0) {
    return (
      <div className="tab tab--empty">
        <p className="tab__empty-message">No cards yet.</p>
      </div>
    )
  }

  return (
    <ul className="tab">
      {entries.map((entry, index) => (
        <li key={entry.card.id} className="tab__item">
          <Card
            title={entry.card.title}
            body={entry.card.body}
            foldState={entry.foldState}
            hiddenState={entry.hiddenState}
            onToggleFold={
              entry.foldState
                ? () => onUnfold?.(entry.card.id)
                : () => onFold?.(entry.card.id)
            }
            onToggleHide={
              entry.hiddenState
                ? () => onUnhide?.(entry.card.id)
                : () => onHide?.(entry.card.id)
            }
            onMoveUp={index > 0 ? () => onReorder?.(entry.card.id, entry.position - 1) : undefined}
            onMoveDown={
              index < entries.length - 1
                ? () => onReorder?.(entry.card.id, entry.position + 1)
                : undefined
            }
            onUpdate={onUpdate ? (fields) => onUpdate(entry.card.id, fields) : undefined}
            onClose={onRemove ? () => onRemove(entry.card.id) : undefined}
          />
        </li>
      ))}
    </ul>
  )
}
