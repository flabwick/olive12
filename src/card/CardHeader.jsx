import './CardHeader.css'

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
      <svg viewBox="-1 -1 18 14" width="12" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 2l12 8" />
        <path d="M6.5 3.5C7 3.2 7.5 3 8 3c2 0 5 2 7 5-.6.9-1.3 1.7-2 2.3" />
        <path d="M3.3 4.7C2.5 5.3 1.7 6.1 1 7c2 3 5 5 7 5 1 0 2-.3 3-.8" />
        <circle cx="8" cy="7" r="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="-1 -1 18 12" width="12" height="8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 5C3 2 6 0 8 0s5 2 7 5c-2 3-5 5-7 5S3 8 1 5z" />
      <circle cx="8" cy="5" r="2" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 10 12" width="9" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 1h6v10l-3-2-3 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 10 10" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 5.5l2.5 2.5 5-5" />
    </svg>
  )
}

function SendToTabIcon() {
  return (
    <svg viewBox="0 0 10 12" width="9" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="1" x2="9" y2="1" />
      <path d="M5 11V4M2 6.5l3-3 3 3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M1 1l8 8M9 1l-8 8" />
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 12 10" width="12" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3H10M8 1l2 2-2 2" />
      <path d="M10 7H2M4 5l-2 2 2 2" />
    </svg>
  )
}

export function CardHeader({
  title,
  editing = false,
  onTitleChange,
  onTitleBlur,
  onTitleKeyDown,
  inputRef,
  onTitleClick,
  folded = false,
  hidden = false,
  selected = false,
  location = 'none',
  onSaveToShelf,
  onToggleFold,
  onToggleHide,
  onToggleSelect,
  onFlip,
  onSendToTab,
  onClose,
}) {
  const hasControls = onSaveToShelf || onToggleHide || onFlip || onSendToTab || onClose

  return (
    <div className="card-header">
      {onToggleSelect && (
        <label className="card-header__select" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="card-header__select-input"
            aria-label="Select card"
            checked={selected}
            onChange={() => onToggleSelect()}
          />
        </label>
      )}
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
          onBlur={onTitleBlur}
          onKeyDown={onTitleKeyDown}
          aria-label="Card title"
        />
      ) : (
        <h3
          className={`card-header__title${onTitleClick ? ' card-header__title--editable' : ''}`}
          onClick={onTitleClick}
          onMouseDown={onTitleClick ? (e) => e.stopPropagation() : undefined}
          tabIndex={onTitleClick ? 0 : undefined}
          onKeyDown={onTitleClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTitleClick()
            }
          } : undefined}
        >
          {title || (onTitleClick ? <span className="card-header__title-placeholder">Untitled</span> : null)}
        </h3>
      )}

      {hasControls && (
        <div className="card-header__controls">
          {onSaveToShelf && (
            location !== 'none' ? (
              <button
                type="button"
                className="card-header__control card-header__control--saved"
                aria-label="Saved"
                disabled
              >
                <CheckIcon />
              </button>
            ) : (
              <button
                type="button"
                className="card-header__control"
                onClick={onSaveToShelf}
                aria-label="Save card"
              >
                <SaveIcon />
              </button>
            )
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
          {onSendToTab && (
            <button
              type="button"
              className="card-header__control"
              onClick={onSendToTab}
              aria-label="Move to tab"
            >
              <SendToTabIcon />
            </button>
          )}
          {onFlip && (
            <button
              type="button"
              className="card-header__control"
              onClick={onFlip}
              aria-label="Flip card"
            >
              <FlipIcon />
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
