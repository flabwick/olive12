import { VaultView } from '../vault/VaultView'
import './Sidebar.css'

export function Sidebar({
  open,
  onClose,
  vaultView,
  onChangeVaultView,
  shelfEntries = [],
  libraryEntries = [],
  folders = [],
  onMoveToLibrary,
  onCreateFolder,
}) {
  return (
    <aside
      className={`sidebar${open ? ' sidebar--open' : ''}`}
      aria-label="Sidebar"
    >
      {/* Brand */}
      <div className="sidebar__brand">
        <span className="sidebar__brand-name">olive</span>
        <button
          type="button"
          className="sidebar__close-btn"
          aria-label="Close sidebar"
          onClick={onClose}
        >
          <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>

      {/* Vault section */}
      <div className="sidebar__section">
        <h2 className="sidebar__section-heading">Vault</h2>
        <VaultView
          view={vaultView}
          onChangeView={onChangeVaultView}
          shelfEntries={shelfEntries}
          libraryEntries={libraryEntries}
          folders={folders}
          onMoveToLibrary={onMoveToLibrary}
          onCreateFolder={onCreateFolder}
        />
      </div>

      {/* Brain section */}
      <div className="sidebar__section sidebar__section--brain">
        <h2 className="sidebar__section-heading">Brain</h2>
        <div className="sidebar__brain-placeholder">
          <svg className="sidebar__brain-icon" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20 28C11 28 4 22 4 16c0-3 1.5-5.5 4-7.5" />
            <path d="M20 28c9 0 16-6 16-12 0-3-1.5-5.5-4-7.5" />
            <path d="M12 8.5C12 5.4 15.6 3 20 3s8 2.4 8 5.5" />
            <circle cx="11" cy="16" r="2.5" />
            <circle cx="29" cy="16" r="2.5" />
            <path d="M13.5 16h13" />
            <path d="M20 13.5v5" />
          </svg>
          <p className="sidebar__brain-text">Neural summaries, connections & more — coming soon.</p>
        </div>
      </div>
    </aside>
  )
}
