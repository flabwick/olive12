import { useEffect, useState } from 'react'
import { BrainFeedList } from '../brain/BrainFeedList'
import { ShelfView } from '../vault/ShelfView'
import { LibraryView } from '../vault/LibraryView'
import { SelectionToolbar } from '../vault/SelectionToolbar'
import { DuplicateConflictModal } from '../vault/DuplicateConflictModal'
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
  renamingItemId = null,
  onInlineRenameCommit,
  onInlineRenameCancel,
}) {
  const [internalTab, setInternalTab] = useState(initialTab)
  const activeTab = propActiveTab !== undefined ? propActiveTab : internalTab
  const [selected, setSelected] = useState(new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [openFolderIds, setOpenFolderIds] = useState(new Set())
  const [conflictModal, setConflictModal] = useState(null)
  // { itemId, itemType, newName, conflictId, pathId }

  // Auto-expand ancestors when an item is being renamed so it's visible
  useEffect(() => {
    if (!renamingItemId) return
    const ancestorIds = []

    const folder = folders.find((f) => f.id === renamingItemId)
    if (folder) {
      let cur = folder
      while (cur.parentId) {
        ancestorIds.push(cur.parentId)
        cur = folders.find((f) => f.id === cur.parentId) ?? { parentId: null }
      }
    } else {
      const card = libraryEntries.find((c) => c.id === renamingItemId)
      if (card?.folderId) {
        ancestorIds.push(card.folderId)
        let cur = folders.find((f) => f.id === card.folderId)
        while (cur?.parentId) {
          ancestorIds.push(cur.parentId)
          cur = folders.find((f) => f.id === cur.parentId)
        }
      }
    }

    if (ancestorIds.length > 0) {
      setOpenFolderIds((prev) => {
        const next = new Set(prev)
        for (const id of ancestorIds) next.add(id)
        return next
      })
    }
  }, [renamingItemId, folders, libraryEntries])

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

  // Called by LibraryView / ShelfView when the inline rename input is committed.
  // pathId = parentId for folders, folderId for cards
  function handleRenameCommit(itemId, itemType, newName, hasConflict, pathId) {
    if (hasConflict) {
      // Find the conflicting item to get its ID for Replace action
      const conflict = itemType === 'folder'
        ? folders.find((f) => f.id !== itemId && f.parentId === pathId && f.name.trim().toLowerCase() === newName.trim().toLowerCase())
        : [...shelfEntries, ...libraryEntries].find((c) => c.id !== itemId && (c.folderId ?? null) === (pathId ?? null) && (c.title ?? '').trim().toLowerCase() === newName.trim().toLowerCase())
      setConflictModal({
        itemId,
        itemType,
        newName,
        pathId,
        conflictId: conflict?.id ?? null,
        conflictName: newName,
      })
    } else {
      onInlineRenameCommit?.(itemId, itemType, newName)
    }
  }

  function handleRenameCancel(itemId, itemType) {
    onInlineRenameCancel?.(itemId, itemType)
  }

  // Conflict modal actions
  function handleConflictReplace() {
    if (!conflictModal) return
    const { itemId, itemType, newName, conflictId } = conflictModal
    onInlineRenameCommit?.(itemId, itemType, newName, { replaceId: conflictId })
    setConflictModal(null)
  }

  function handleConflictKeepBoth() {
    if (!conflictModal) return
    const { itemId, itemType, newName } = conflictModal
    onInlineRenameCommit?.(itemId, itemType, newName, { keepBoth: true })
    setConflictModal(null)
  }

  function handleConflictCancel() {
    if (!conflictModal) return
    onInlineRenameCancel?.(conflictModal.itemId, conflictModal.itemType)
    setConflictModal(null)
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
            renamingId={renamingItemId}
            onSelect={toggleSelect}
            onItemClick={handleItemClick}
            onRenameCommit={handleRenameCommit}
            onRenameCancel={handleRenameCancel}
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
            renamingId={renamingItemId}
            onSelect={toggleSelect}
            onItemClick={handleItemClick}
            onFolderClick={handleFolderClick}
            onCreateFolder={onCreateFolder}
            onUploadCard={onUploadCard}
            onToggleFolder={toggleFolder}
            onRenameCommit={handleRenameCommit}
            onRenameCancel={handleRenameCancel}
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

      {conflictModal && (
        <DuplicateConflictModal
          itemType={conflictModal.itemType}
          conflictName={conflictModal.conflictName}
          onReplace={handleConflictReplace}
          onKeepBoth={handleConflictKeepBoth}
          onCancel={handleConflictCancel}
        />
      )}
    </div>
  )
}
