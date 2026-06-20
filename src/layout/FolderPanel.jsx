import { useState } from 'react'
import { BrainFeed } from '../brain/BrainFeed'
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
  brainFeedItems = [],
  onMoveToLibrary,
  onMoveTabToLibrary,
  onCreateFolder,
  onClose,
  onOpenAsPortal,
  onOpenTab,
  onBrainAccept,
  onBrainDismiss,
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
          <BrainFeed
            items={brainFeedItems}
            onAccept={onBrainAccept}
            onDismiss={onBrainDismiss}
          />
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
