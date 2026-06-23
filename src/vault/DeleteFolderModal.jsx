import './DeleteFolderModal.css'

export function DeleteFolderModal({ name, cardCount, folderCount, onConfirm, onCancel }) {
  const deletedItemCount = cardCount + folderCount
  const detail =
    deletedItemCount === 0
      ? 'This cannot be undone.'
      : `This will permanently delete ${deletedItemCount} item${deletedItemCount !== 1 ? 's' : ''}${folderCount > 0 ? ` including ${folderCount} nested folder${folderCount !== 1 ? 's' : ''}` : ''}. This cannot be undone.`

  return (
    <div className="delete-folder-modal__backdrop" onClick={onCancel}>
      <div
        className="delete-folder-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Confirm delete folder"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="delete-folder-modal__heading">
          Delete <strong>"{name}"</strong>?
        </p>
        <p className="delete-folder-modal__detail">{detail}</p>
        <div className="delete-folder-modal__actions">
          <button
            type="button"
            className="delete-folder-modal__btn delete-folder-modal__btn--cancel"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-folder-modal__btn delete-folder-modal__btn--confirm"
            onClick={onConfirm}
          >
            Delete all
          </button>
        </div>
      </div>
    </div>
  )
}
