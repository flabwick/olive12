import { useState } from 'react'
import { ShelfRow } from '../vault/ShelfRow'
import { FolderTree } from '../vault/FolderTree'
import { VaultTabRow } from '../vault/VaultTabRow'
import './FolderPanel.css'

const TABS = ['shelf', 'library', 'brain']

export function FolderPanel({
  shelfEntries = [],
  libraryEntries = [],
  shelfTabs = [],
  libraryTabs = [],
  folders = [],
  onMoveToLibrary,
  onMoveTabToLibrary,
  onCreateFolder,
  onClose,
  onOpenAsPortal,
  onOpenTab,
  initialTab = 'shelf',
  highlightedCardId,
}) {
  const [tab, setTab] = useState(initialTab)

  const shelfEmpty = shelfEntries.length === 0 && shelfTabs.length === 0

  return (
    <div className="folder-panel" role="dialog" aria-label="Vault and Brain" aria-modal="true">
      {/* Content sits at the top, scrolls if it overflows */}
      <div className="folder-panel__body">
        {tab === 'shelf' && (
          shelfEmpty ? (
            <p className="folder-panel__empty">Shelf is empty. Save some cards from your tab.</p>
          ) : (
            <div className="folder-panel__shelf-list" role="list">
              {shelfTabs.map((t) => (
                <VaultTabRow
                  key={t.id}
                  tab={t}
                  onOpen={onOpenTab ? () => onOpenTab(t.id) : undefined}
                  onMoveToLibrary={onMoveTabToLibrary ? () => onMoveTabToLibrary(t.id) : undefined}
                />
              ))}
              {shelfEntries.map((card) => (
                <ShelfRow
                  key={card.id}
                  card={card}
                  onMoveToLibrary={onMoveToLibrary ? () => onMoveToLibrary(card.id, null) : undefined}
                  onOpenAsPortal={onOpenAsPortal}
                  highlighted={card.id === highlightedCardId}
                />
              ))}
            </div>
          )
        )}

        {tab === 'library' && (
          <>
            {libraryTabs.length > 0 && (
              <div className="folder-panel__shelf-list" role="list">
                {libraryTabs.map((t) => (
                  <VaultTabRow
                    key={t.id}
                    tab={t}
                    onOpen={onOpenTab ? () => onOpenTab(t.id) : undefined}
                  />
                ))}
              </div>
            )}
            <FolderTree
              folders={folders}
              cards={libraryEntries}
              onCreateFolder={onCreateFolder}
              onOpenAsPortal={onOpenAsPortal}
              highlightedCardId={highlightedCardId}
            />
          </>
        )}

        {tab === 'brain' && (
          <div className="folder-panel__brain">
            <svg className="folder-panel__brain-icon" viewBox="0 0 40 32" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 28C11 28 4 22 4 16c0-3 1.5-5.5 4-7.5" />
              <path d="M20 28c9 0 16-6 16-12 0-3-1.5-5.5-4-7.5" />
              <path d="M12 8.5C12 5.4 15.6 3 20 3s8 2.4 8 5.5" />
              <circle cx="11" cy="16" r="2.5" />
              <circle cx="29" cy="16" r="2.5" />
              <path d="M13.5 16h13" />
              <path d="M20 13.5v5" />
            </svg>
            <p className="folder-panel__brain-text">Neural summaries, connections &amp; more — coming soon.</p>
          </div>
        )}
      </div>

      {/* Tab nav pinned to the bottom of the panel */}
      <div className="folder-panel__nav-bar">
        <nav className="folder-panel__nav" role="tablist">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              className={`folder-panel__tab${tab === t ? ' folder-panel__tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="folder-panel__close"
          aria-label="Close"
          onClick={onClose}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" aria-hidden="true">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>
      </div>
    </div>
  )
}
