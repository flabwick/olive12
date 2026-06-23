import { useState } from 'react'
import './SelectionToolbar.css'

export function SelectionToolbar({ count, onMove, onDelete, onDone }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  function handleDelete() {
    if (confirmDelete) {
      onDelete()
      setConfirmDelete(false)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <div className="vault-selection-toolbar" role="toolbar" aria-label="Selection actions">
      <span className="vault-selection-toolbar__count">{count} selected</span>
      <button className="vault-selection-toolbar__btn" onClick={onMove} disabled={count === 0}>
        Move
      </button>
      {confirmDelete ? (
        <button
          className="vault-selection-toolbar__btn vault-selection-toolbar__btn--danger"
          onClick={handleDelete}
        >
          Confirm delete
        </button>
      ) : (
        <button
          className="vault-selection-toolbar__btn"
          onClick={handleDelete}
          disabled={count === 0}
        >
          Delete
        </button>
      )}
      <button className="vault-selection-toolbar__btn vault-selection-toolbar__btn--done" onClick={onDone}>
        Done
      </button>
    </div>
  )
}
