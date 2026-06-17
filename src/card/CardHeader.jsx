import { LocationButton } from './LocationButton'
import './CardHeader.css'

function ArrowUpIcon() {
  return (
    <svg
      viewBox="0 0 10 12"
      width="8"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 11V1M2 4l3-3 3 3" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg
      viewBox="0 0 10 12"
      width="8"
      height="11"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 1v10M2 8l3 3 3-3" />
    </svg>
  )
}

function CaretIcon({ folded }) {
  return (
    <svg
      className={`card-header__caret-icon${folded ? ' card-header__caret-icon--folded' : ''}`}
      viewBox="0 0 10 6"
      width="10"
      height="6"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  )
}

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg
        viewBox="0 0 16 12"
        width="16"
        height="12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M2 2l12 8" />
        <path d="M6.5 3.5C7 3.2 7.5 3 8 3c2 0 5 2 7 5-.6.9-1.3 1.7-2 2.3" />
        <path d="M3.3 4.7C2.5 5.3 1.7 6.1 1 7c2 3 5 5 7 5 1 0 2-.3 3-.8" />
        <circle cx="8" cy="7" r="2" />
      </svg>
    )
  }

  return (
    <svg
      viewBox="0 0 16 10"
      width="16"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 5C3 2 6 0 8 0s5 2 7 5c-2 3-5 5-7 5S3 8 1 5z" />
      <circle cx="8" cy="5" r="2" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 10 10"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M1 1l8 8M9 1l-8 8" />
    </svg>
  )
}

export function CardHeader({
  title,
  editing = false,
  onTitleChange,
  inputRef,
  onTitleClick,
  folded = false,
  hidden = false,
  location = 'none',
  folders = [],
  onSaveToShelf,
  onMoveToLibrary,
  onToggleFold,
  onToggleHide,
  onMoveUp,
  onMoveDown,
  onClose,
}) {
  const hasRightControls = onMoveUp || onMoveDown || onToggleHide || onClose
  const hasLocationButton =
    (location === 'none' && onSaveToShelf) ||
    (location === 'shelf' && onMoveToLibrary) ||
    location === 'library'

  return (
    <div className="card-header">
      {onToggleFold && (
        <button
          type="button"
          className="card-header__fold-toggle"
          onClick={onToggleFold}
          aria-label={folded ? 'Expand card' : 'Collapse card'}
        >
          <CaretIcon folded={folded} />
        </button>
      )}

      {editing ? (
        <input
          ref={inputRef}
          className="card-header__title-input"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          aria-label="Card title"
        />
      ) : (
        <h3
          className={`card-header__title${onTitleClick ? ' card-header__title--editable' : ''}`}
          onClick={onTitleClick}
          tabIndex={onTitleClick ? 0 : undefined}
          onKeyDown={onTitleClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTitleClick()
            }
          } : undefined}
        >
          {title}
        </h3>
      )}

      {hasLocationButton && (
        <div className="card-header__location">
          <LocationButton
            location={location}
            folders={folders}
            onSaveToShelf={onSaveToShelf}
            onMoveToLibrary={onMoveToLibrary}
          />
        </div>
      )}

      {hasRightControls && (
        <div className="card-header__controls">
          {onMoveUp && (
            <button
              type="button"
              className="card-header__control"
              onClick={onMoveUp}
              aria-label="Move card up"
            >
              <ArrowUpIcon />
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              className="card-header__control"
              onClick={onMoveDown}
              aria-label="Move card down"
            >
              <ArrowDownIcon />
            </button>
          )}
          {onToggleHide && (
            <button
              type="button"
              className="card-header__control"
              onClick={onToggleHide}
              aria-label={hidden ? 'Show card' : 'Dim card'}
            >
              <EyeIcon hidden={hidden} />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="card-header__control card-header__control--close"
              onClick={onClose}
              aria-label="Remove card"
            >
              <CloseIcon />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
