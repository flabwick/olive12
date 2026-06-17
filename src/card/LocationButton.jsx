import { useState } from 'react'
import { FolderPickerOverlay } from './FolderPickerOverlay'
import './LocationButton.css'

export function LocationButton({ location = 'none', folders = [], onSaveToShelf, onMoveToLibrary }) {
  const [overlayOpen, setOverlayOpen] = useState(false)

  if (location === 'none') {
    return onSaveToShelf ? (
      <button
        type="button"
        className="location-btn location-btn--add"
        aria-label="Save to Shelf"
        onClick={onSaveToShelf}
      >
        +
      </button>
    ) : null
  }

  if (location === 'shelf') {
    return (
      <div className="location-btn-wrapper">
        <button
          type="button"
          className="location-btn location-btn--shelf"
          aria-label="Saved to Shelf — click to move to Library"
          onClick={() => setOverlayOpen(true)}
        >
          ✓
        </button>
        {overlayOpen && (
          <FolderPickerOverlay
            folders={folders}
            onSelect={(folderId) => {
              onMoveToLibrary?.(folderId)
              setOverlayOpen(false)
            }}
            onDismiss={() => setOverlayOpen(false)}
          />
        )}
      </div>
    )
  }

  if (location === 'library') {
    return (
      <button
        type="button"
        className="location-btn location-btn--library"
        aria-label="In Library"
        disabled
      >
        ✓
      </button>
    )
  }

  return null
}
