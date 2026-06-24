import './DuplicateConflictModal.css'

export function DuplicateConflictModal({
  itemType,
  conflictName,
  onReplace,
  onKeepBoth,
  onCancel,
}) {
  const label = itemType === 'folder' ? 'folder' : 'card'
  return (
    <div className="dup-conflict-modal__backdrop" onClick={onCancel}>
      <div
        className="dup-conflict-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Name conflict"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="dup-conflict-modal__heading">
          A {label} named <strong>"{conflictName}"</strong> already exists here.
        </p>
        <div className="dup-conflict-modal__actions">
          <button className="dup-conflict-modal__btn dup-conflict-modal__btn--danger" onClick={onReplace}>
            Replace
          </button>
          <button className="dup-conflict-modal__btn" onClick={onKeepBoth}>
            Keep both
          </button>
          <button className="dup-conflict-modal__btn dup-conflict-modal__btn--cancel" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
