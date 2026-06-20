import './BrainFeedItem.css'

export function BrainFeedItem({ cardId, title, reason, onAccept, onDismiss }) {
  const displayTitle = title || '(untitled)'

  return (
    <div className="brain-feed-item" role="listitem">
      <span className="brain-feed-item__title">{displayTitle}</span>
      <span className={`brain-feed-item__badge brain-feed-item__badge--${reason}`}>
        {reason === 'stale' ? 'Stale' : 'Orphan'}
      </span>
      <div className="brain-feed-item__actions">
        <button
          type="button"
          className="brain-feed-item__accept"
          onClick={() => onAccept(cardId)}
        >
          Accept
        </button>
        <button
          type="button"
          className="brain-feed-item__dismiss"
          onClick={() => onDismiss(cardId)}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
