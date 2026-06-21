import './BrainFeedItem.css'

const REASON_LABELS = {
  stale: 'Stale',
  orphan: 'Orphan',
}

export function BrainFeedItem({ cardId, title, reason, onReindex, onAccept, onDismiss }) {
  return (
    <div className="brain-feed-item" role="listitem">
      <span className="brain-feed-item__title">{title}</span>
      <span className={`brain-feed-item__badge brain-feed-item__badge--${reason}`}>
        {REASON_LABELS[reason]}
      </span>
      {onReindex && (
        <button
          type="button"
          className="brain-feed-item__reindex-btn"
          aria-label={`Re-index ${title}`}
          onClick={() => onReindex(cardId)}
        >
          Re-index
        </button>
      )}
      {onAccept && (
        <button
          type="button"
          className="brain-feed-item__accept-btn"
          aria-label="Accept"
          onClick={() => onAccept(cardId)}
        >
          Accept
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          className="brain-feed-item__dismiss-btn"
          aria-label="Dismiss"
          onClick={() => onDismiss(cardId)}
        >
          Dismiss
        </button>
      )}
    </div>
  )
}
