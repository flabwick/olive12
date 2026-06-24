import { buildFolderTree } from '../folder/createFolder'
import { findDuplicateCard, findDuplicateFolder } from './duplicateLogic'
import { FolderNode } from './FolderNode'
import { VaultItemRow } from './VaultItemRow'
import './LibraryView.css'

function renderFolderTree({
  nodes,
  allFolders,
  cards,
  tabs,
  selected,
  selectMode,
  openFolderIds,
  activeItemId,
  renamingId,
  onSelect,
  onItemClick,
  onFolderClick,
  onToggleFolder,
  onRenameCommit,
  onRenameCancel,
  depth = 0,
}) {
  return nodes.map((node) => {
    const folderCards = cards.filter((c) => c.folderId === node.id)
    const folderTabs = tabs.filter((t) => t.savedFolderId === node.id)
    const isOpen = openFolderIds.has(node.id)
    const isEditing = node.id === renamingId

    const checkFolderConflict = isEditing
      ? (name) => !!findDuplicateFolder(allFolders, name, node.parentId, node.id)
      : undefined

    return (
      <FolderNode
        key={node.id}
        folder={node}
        isOpen={isOpen}
        depth={depth}
        active={node.id === activeItemId}
        editing={isEditing}
        checkConflict={checkFolderConflict}
        onRenameCommit={(name, hasConflict) => onRenameCommit?.(node.id, 'folder', name, hasConflict, node.parentId)}
        onRenameCancel={() => onRenameCancel?.(node.id, 'folder')}
        onToggle={() => onToggleFolder?.(node.id)}
        onClick={onFolderClick}
      >
        {isOpen && (
          <>
            {node.children.length > 0 && renderFolderTree({
              nodes: node.children,
              allFolders,
              cards,
              tabs,
              selected,
              selectMode,
              openFolderIds,
              activeItemId,
              renamingId,
              onSelect,
              onItemClick,
              onFolderClick,
              onToggleFolder,
              onRenameCommit,
              onRenameCancel,
              depth: depth + 1,
            })}
            {folderCards.map((card) => {
              const isCardEditing = card.id === renamingId
              const checkCardConflict = isCardEditing
                ? (name) => !!findDuplicateCard(cards, name, card.folderId, card.id)
                : undefined
              return (
                <VaultItemRow
                  key={card.id}
                  type="card"
                  title={card.title || '(untitled)'}
                  depth={depth + 1}
                  active={card.id === activeItemId}
                  selected={selected.has(card.id)}
                  selectMode={selectMode}
                  editing={isCardEditing}
                  checkConflict={checkCardConflict}
                  onRenameCommit={(name, hasConflict) => onRenameCommit?.(card.id, 'card', name, hasConflict, card.folderId)}
                  onRenameCancel={() => onRenameCancel?.(card.id, 'card')}
                  onSelect={() => onSelect?.(card.id)}
                  onClick={() => onItemClick?.(card, 'card')}
                />
              )
            })}
            {folderTabs.map((tab) => (
              <VaultItemRow
                key={tab.id}
                type="tab"
                title={tab.name || '(untitled)'}
                depth={depth + 1}
                active={tab.id === activeItemId}
                selected={selected.has(tab.id)}
                selectMode={selectMode}
                onSelect={() => onSelect?.(tab.id)}
                onClick={() => onItemClick?.(tab, 'tab')}
              />
            ))}
          </>
        )}
      </FolderNode>
    )
  })
}

export function LibraryView({
  cards = [],
  tabs = [],
  folders = [],
  selected = new Set(),
  selectMode = false,
  openFolderIds = new Set(),
  activeItemId,
  renamingId,
  onSelect,
  onItemClick,
  onFolderClick,
  onCreateFolder,
  onUploadCard,
  onToggleFolder,
  onRenameCommit,
  onRenameCancel,
}) {
  const tree = buildFolderTree(folders)
  const rootCards = cards.filter((c) => !c.folderId)
  const rootTabs = tabs.filter((t) => !t.savedFolderId)

  return (
    <div className="vault-library-view">
      <div className="vault-library-view__content">
        {renderFolderTree({
          nodes: tree,
          allFolders: folders,
          cards,
          tabs,
          selected,
          selectMode,
          openFolderIds,
          activeItemId,
          renamingId,
          onSelect,
          onItemClick,
          onFolderClick,
          onToggleFolder,
          onRenameCommit,
          onRenameCancel,
        })}
        {rootCards.map((card) => {
          const isEditing = card.id === renamingId
          const checkConflict = isEditing
            ? (name) => !!findDuplicateCard(cards, name, null, card.id)
            : undefined
          return (
            <VaultItemRow
              key={card.id}
              type="card"
              title={card.title || '(untitled)'}
              active={card.id === activeItemId}
              selected={selected.has(card.id)}
              selectMode={selectMode}
              editing={isEditing}
              checkConflict={checkConflict}
              onRenameCommit={(name, hasConflict) => onRenameCommit?.(card.id, 'card', name, hasConflict, null)}
              onRenameCancel={() => onRenameCancel?.(card.id, 'card')}
              onSelect={() => onSelect?.(card.id)}
              onClick={() => onItemClick?.(card, 'card')}
            />
          )
        })}
        {rootTabs.map((tab) => (
          <VaultItemRow
            key={tab.id}
            type="tab"
            title={tab.name || '(untitled)'}
            active={tab.id === activeItemId}
            selected={selected.has(tab.id)}
            selectMode={selectMode}
            onSelect={() => onSelect?.(tab.id)}
            onClick={() => onItemClick?.(tab, 'tab')}
          />
        ))}
        {folders.length === 0 && cards.length === 0 && tabs.length === 0 && (
          <p className="vault-library-view__empty">Nothing in library yet.</p>
        )}
      </div>
    </div>
  )
}
