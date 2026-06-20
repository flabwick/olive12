import { BrainFeedItem } from './BrainFeedItem'
import './BrainFeed.css'

export function BrainFeed({ items = [], onAccept, onDismiss }) {
  if (items.length === 0) {
    return <p className="brain-feed__empty">No maintenance needed.</p>
  }

  return (
    <div className="brain-feed" role="list">
      {items.map((item) => (
        <BrainFeedItem
          key={item.cardId}
          cardId={item.cardId}
          title={item.title}
          reason={item.reason}
          onAccept={onAccept}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  )
}
