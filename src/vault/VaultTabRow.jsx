import './VaultTabRow.css'

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function VaultTabRow({ tab, onOpen, onMoveToLibrary }) {
  return (
    <div className="vault-tab-row" role="listitem">
      <span className="vault-tab-row__name">{tab.name}</span>
      <span className="vault-tab-row__type">tab</span>
      <span className="vault-tab-row__date">{formatDate(tab.createdAt)}</span>
      {onOpen && (
        <button
          type="button"
          className="vault-tab-row__open-btn"
          aria-label="Switch to tab"
          onClick={() => onOpen(tab.id)}
        >
          ↗
        </button>
      )}
      {onMoveToLibrary && (
        <button
          type="button"
          className="vault-tab-row__move-btn"
          aria-label="Move to Library"
          onClick={onMoveToLibrary}
        >
          →
        </button>
      )}
    </div>
  )
}
