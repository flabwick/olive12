import './ShelfRow.css'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ShelfRow({ card, onMoveToLibrary, onOpenAsPortal, highlighted }) {
  return (
    <div className={`shelf-row${highlighted ? ' shelf-row--highlighted' : ''}`} role="listitem">
      <span className="shelf-row__title">{card.title}</span>
      <span className="shelf-row__type">{card.type}</span>
      <span className="shelf-row__date">{formatDate(card.createdAt)}</span>
      {onOpenAsPortal && (
        <button
          type="button"
          className="shelf-row__open-btn"
          aria-label="Open in tab"
          onClick={() => onOpenAsPortal(card.id)}
        >
          ↗
        </button>
      )}
      {onMoveToLibrary && (
        <button
          type="button"
          className="shelf-row__move-btn"
          aria-label="Move to Library"
          onClick={onMoveToLibrary}
        >
          →
        </button>
      )}
    </div>
  )
}
