import { BrainFeedItem } from './BrainFeedItem'
import './BrainFeedList.css'

export function BrainFeedList({ items = [], onReindex }) {
  if (items.length === 0) {
    return <p className="brain-feed-list__empty">No issues found.</p>
  }

  return (
    <div className="brain-feed-list" role="list" aria-label="Brain feed">
      {items.map((item) => (
        <BrainFeedItem
          key={item.cardId}
          cardId={item.cardId}
          title={item.title}
          reason={item.reason}
          onReindex={onReindex}
        />
      ))}
    </div>
  )
}
