import './AddCardButton.css'

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function AddCardButton({ onClick }) {
  return (
    <button
      type="button"
      className="add-card-btn"
      aria-label="Add new card"
      onClick={onClick}
    >
      <PlusIcon />
      <span>New card</span>
    </button>
  )
}
