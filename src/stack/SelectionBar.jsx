import './SelectionBar.css'

export function SelectionBar({ count = 0, onCreateStack, onMove, onClear }) {
  return (
    <div className="selection-bar" role="toolbar" aria-label="Selection actions">
      <span className="selection-bar__count">{count} selected</span>
      <button
        type="button"
        className="selection-bar__btn"
        onClick={onCreateStack}
        disabled={count < 2}
        aria-label="Create stack from selection"
      >
        Create Stack
      </button>
      {onMove && (
        <button
          type="button"
          className="selection-bar__btn"
          onClick={onMove}
          aria-label="Move selection"
        >
          Move
        </button>
      )}
      <button
        type="button"
        className="selection-bar__btn selection-bar__btn--clear"
        onClick={onClear}
        aria-label="Clear selection"
      >
        Clear
      </button>
    </div>
  )
}
