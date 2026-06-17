import { useState } from 'react'
import { FolderPickerOverlay } from '../card/FolderPickerOverlay'
import './ShelfRow.css'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ShelfRow({ card, folders = [], onMoveToLibrary }) {
  const [overlayOpen, setOverlayOpen] = useState(false)

  return (
    <div className="shelf-row" role="listitem">
      <span className="shelf-row__title">{card.title}</span>
      <span className="shelf-row__type">{card.type}</span>
      <span className="shelf-row__date">{formatDate(card.createdAt)}</span>
      {onMoveToLibrary && (
        <div className="shelf-row__action">
          <button
            type="button"
            className="shelf-row__move-btn"
            aria-label="Move to Library"
            onClick={() => setOverlayOpen(true)}
          >
            →
          </button>
          {overlayOpen && (
            <FolderPickerOverlay
              folders={folders}
              onSelect={(folderId) => {
                onMoveToLibrary(folderId)
                setOverlayOpen(false)
              }}
              onDismiss={() => setOverlayOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  )
}
