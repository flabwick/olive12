import { buildFolderTree } from '../folder/createFolder'
import { FolderNode } from './FolderNode'
import { VaultItemRow } from './VaultItemRow'
import './LibraryView.css'

function renderFolderTree({
  nodes,
  cards,
  tabs,
  selected,
  selectMode,
  openFolderIds,
  activeItemId,
  onSelect,
  onItemClick,
  onFolderClick,
  onToggleFolder,
  depth = 0,
}) {
  return nodes.map((node) => {
    const folderCards = cards.filter((c) => c.folderId === node.id)
    const folderTabs = tabs.filter((t) => t.savedFolderId === node.id)
    const isOpen = openFolderIds.has(node.id)

    return (
      <FolderNode
        key={node.id}
        folder={node}
        isOpen={isOpen}
        depth={depth}
        active={node.id === activeItemId}
        onToggle={() => onToggleFolder?.(node.id)}
        onClick={onFolderClick}
      >
        {isOpen && (
          <>
            {node.children.length > 0 && renderFolderTree({
              nodes: node.children,
              cards,
              tabs,
              selected,
              selectMode,
              openFolderIds,
              activeItemId,
              onSelect,
              onItemClick,
              onFolderClick,
              onToggleFolder,
              depth: depth + 1,
            })}
            {folderCards.map((card) => (
              <VaultItemRow
                key={card.id}
                type="card"
                title={card.title || '(untitled)'}
                depth={depth + 1}
                active={card.id === activeItemId}
                selected={selected.has(card.id)}
                selectMode={selectMode}
                onSelect={() => onSelect?.(card.id)}
                onClick={() => onItemClick?.(card, 'card')}
              />
            ))}
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
  onSelect,
  onItemClick,
  onFolderClick,
  onCreateFolder,
  onUploadCard,
  onToggleFolder,
}) {
  const tree = buildFolderTree(folders)
  const rootCards = cards.filter((c) => !c.folderId)
  const rootTabs = tabs.filter((t) => !t.savedFolderId)

  return (
    <div className="vault-library-view">
      <div className="vault-library-view__content">
        {renderFolderTree({
          nodes: tree,
          cards,
          tabs,
          selected,
          selectMode,
          openFolderIds,
          activeItemId,
          onSelect,
          onItemClick,
          onFolderClick,
          onToggleFolder,
        })}
        {rootCards.map((card) => (
          <VaultItemRow
            key={card.id}
            type="card"
            title={card.title || '(untitled)'}
            active={card.id === activeItemId}
            selected={selected.has(card.id)}
            selectMode={selectMode}
            onSelect={() => onSelect?.(card.id)}
            onClick={() => onItemClick?.(card, 'card')}
          />
        ))}
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

