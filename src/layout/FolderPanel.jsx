import { useState } from 'react'
import { BrainFeedList } from '../brain/BrainFeedList'
import { ShelfView } from '../vault/ShelfView'
import { LibraryView } from '../vault/LibraryView'
import { SelectionToolbar } from '../vault/SelectionToolbar'
import './FolderPanel.css'

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
  activeTab: propActiveTab,
  highlightedCardId,
  activeVaultItemId,
  onSelectVaultItem,
  brainFeedItems = [],
  onReindex,
  moveCardToFolder,
  moveFolder,
  bulkMoveCards,
  bulkDeleteCards,
  bulkMoveTabs,
  onUploadCard,
  pickFolderMode = false,
  onFolderPicked,
}) {
  const [internalTab, setInternalTab] = useState(initialTab)
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab
  const [selected, setSelected] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [openFolderIds, setOpenFolderIds] = useState(new Set())

  function handleItemClick(item, type) {
    if (pickFolderMode) return
    onSelectVaultItem?.(item, type)
  }

  function handleFolderClick(folder) {
    if (pickFolderMode) {
      onFolderPicked?.(folder)
    } else {
      onSelectVaultItem?.(folder, 'folder')
    }
  }

  function toggleSelect(id) {
    setSelectMode(true)
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  async function handleBulkDelete() {
    const allCards = [...shelfEntries, ...libraryEntries]
    const cardIds = [...selected].filter((id) => allCards.some((c) => c.id === id))
    if (cardIds.length > 0 && bulkDeleteCards) await bulkDeleteCards(cardIds)
    exitSelectMode()
  }

  function toggleFolder(id) {
    setOpenFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="vault-panel" role="dialog" aria-label="Vault and Brain" aria-modal="true">
      <div className="vault-panel__body">
        {activeTab === 'shelf' && (
          <ShelfView
            cards={shelfEntries}
            tabs={shelfTabs}
            selected={selected}
            selectMode={selectMode}
            highlightedCardId={highlightedCardId}
            activeItemId={activeVaultItemId}
            onSelect={toggleSelect}
            onItemClick={handleItemClick}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            cards={libraryEntries}
            tabs={libraryTabs}
            folders={folders}
            selected={selected}
            selectMode={selectMode}
            openFolderIds={openFolderIds}
            activeItemId={activeVaultItemId}
            onSelect={toggleSelect}
            onItemClick={handleItemClick}
            onFolderClick={handleFolderClick}
            onCreateFolder={onCreateFolder}
            onUploadCard={onUploadCard}
            onToggleFolder={toggleFolder}
          />
        )}

        {activeTab === 'brain' && (
          <BrainFeedList items={brainFeedItems} onReindex={onReindex} />
        )}
      </div>

      {selectMode && (
        <SelectionToolbar
          count={selected.size}
          onMove={() => {}}
          onDelete={handleBulkDelete}
          onDone={exitSelectMode}
        />
      )}
    </div>
  )
}
