import './ShelfRow.css'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ShelfRow({ card, onMoveToLibrary }) {
  return (
    <div className="shelf-row" role="listitem">
      <span className="shelf-row__title">{card.title}</span>
      <span className="shelf-row__type">{card.type}</span>
      <span className="shelf-row__date">{formatDate(card.createdAt)}</span>
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
