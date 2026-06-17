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

export function CardHeader({ title, folded = false, hidden = false, onToggleFold, onToggleHide }) {
  return (
    <div className="card-header">
      <h3 className="card-header__title">{title}</h3>
      {(onToggleFold || onToggleHide) && (
        <div className="card-header__controls">
          {onToggleFold && (
            <button
              type="button"
              className="card-header__control"
              onClick={onToggleFold}
              aria-label={folded ? 'Expand card' : 'Collapse card'}
            >
              <CaretIcon folded={folded} />
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
        </div>
      )}
    </div>
  )
}
