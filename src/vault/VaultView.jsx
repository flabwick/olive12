import { FolderTree } from './FolderTree'
import { ShelfRow } from './ShelfRow'
import './VaultView.css'

export function VaultView({
  view,
  onChangeView,
  shelfEntries = [],
  libraryEntries = [],
  folders = [],
  onMoveToLibrary,
  onCreateFolder,
}) {
  return (
    <div className="vault-view">
      <nav className="vault-view__nav" role="tablist" aria-label="Vault views">
        {['shelf', 'library'].map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            className={`vault-view__nav-btn${view === v ? ' vault-view__nav-btn--active' : ''}`}
            onClick={() => onChangeView?.(v)}
          >
            {v === 'shelf' ? 'Shelf' : 'Library'}
          </button>
        ))}
      </nav>

      {view === 'shelf' && (
        <div className="vault-view__pane">
          {shelfEntries.length === 0 ? (
            <p className="vault-view__empty">Shelf is empty. Save some cards from your tab.</p>
          ) : (
            <div className="vault-view__shelf-list" role="list">
              {shelfEntries.map((card) => (
                <ShelfRow
                  key={card.id}
                  card={card}
                  onMoveToLibrary={onMoveToLibrary ? () => onMoveToLibrary(card.id, null) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'library' && (
        <div className="vault-view__pane vault-view__library-pane">
          <FolderTree
            folders={folders}
            cards={libraryEntries}
            onCreateFolder={onCreateFolder}
          />
        </div>
      )}
    </div>
  )
}
