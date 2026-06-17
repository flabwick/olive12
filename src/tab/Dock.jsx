import './Dock.css'

export function Dock({ onAdd, addDisabled = false }) {
  return (
    <div className="dock" role="toolbar" aria-label="Tab actions">
      <button
        type="button"
        className="dock__add"
        onClick={onAdd}
        disabled={addDisabled}
        aria-label="Add card"
      >
        +
      </button>
    </div>
  )
}
