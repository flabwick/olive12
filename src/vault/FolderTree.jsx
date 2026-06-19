import { useState } from 'react'
import { buildFolderTree } from '../folder/createFolder'
import './FolderTree.css'

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`folder-tree__chevron${expanded ? ' folder-tree__chevron--open' : ''}`}
      viewBox="0 0 6 10"
      width="6"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l4 4-4 4" />
    </svg>
  )
}

function FolderIcon({ open }) {
  return (
    <svg
      className="folder-tree__icon folder-tree__icon--folder"
      viewBox="0 0 16 14"
      width="14"
      height="12"
      fill="currentColor"
      aria-hidden="true"
    >
      {open ? (
        <path d="M1 3a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v1H2L1 11V3zm0 8l1-5h13l-1 5a1 1 0 01-1 1H2a1 1 0 01-1-1z" />
      ) : (
        <path d="M1 3a1 1 0 011-1h4l1.5 2H14a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V3z" />
      )}
    </svg>
  )
}

function FileIcon() {
  return (
    <svg
      className="folder-tree__icon folder-tree__icon--file"
      viewBox="0 0 14 16"
      width="12"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 1h7l3 3v11H2V1z" />
      <path d="M9 1v3h3" strokeWidth="1" />
      <path d="M4 7h6M4 10h4" />
    </svg>
  )
}

function FolderNode({ node, cardsByFolderId, onCreateFolder, onOpenAsPortal, highlightedCardId }) {
  const [expanded, setExpanded] = useState(true)
  const cards = cardsByFolderId[node.id] ?? []
  const hasChildren = node.children.length > 0 || cards.length > 0

  return (
    <li className="folder-tree__folder">
      <div className="folder-tree__folder-row">
        <button
          type="button"
          className="folder-tree__toggle"
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          disabled={!hasChildren}
        >
          <ChevronIcon expanded={expanded && hasChildren} />
        </button>
        <FolderIcon open={expanded && hasChildren} />
        <span className="folder-tree__folder-name">{node.name}</span>
        {onCreateFolder && (
          <button
            type="button"
            className="folder-tree__new-subfolder"
            aria-label={`New folder in ${node.name}`}
            onClick={() => onCreateFolder({ parentId: node.id })}
          >
            +
          </button>
        )}
      </div>
      {expanded && hasChildren && (
        <ul className="folder-tree__children">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              cardsByFolderId={cardsByFolderId}
              onCreateFolder={onCreateFolder}
              onOpenAsPortal={onOpenAsPortal}
              highlightedCardId={highlightedCardId}
            />
          ))}
          {cards.map((card) => (
            <li key={card.id} className={`folder-tree__file-row${card.id === highlightedCardId ? ' folder-tree__file-row--highlighted' : ''}`}>
              <FileIcon />
              <span className="folder-tree__file-name">{card.title || '(untitled)'}</span>
              {onOpenAsPortal && (
                <button
                  type="button"
                  className="folder-tree__open-btn"
                  aria-label={`Open ${card.title || '(untitled)'} in tab`}
                  onClick={() => onOpenAsPortal(card.id)}
                >
                  ↗
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function FolderTree({ folders = [], cards = [], onCreateFolder, onOpenAsPortal, highlightedCardId }) {
  const tree = buildFolderTree(folders)
  const rootCards = cards.filter((c) => c.folderId === null)
  const cardsByFolderId = {}
  for (const card of cards) {
    if (card.folderId !== null) {
      if (!cardsByFolderId[card.folderId]) cardsByFolderId[card.folderId] = []
      cardsByFolderId[card.folderId].push(card)
    }
  }

  return (
    <div className="folder-tree" role="tree" aria-label="Library">
      {onCreateFolder && (
        <div className="folder-tree__toolbar">
          <button
            type="button"
            className="folder-tree__new-root-folder"
            aria-label="New folder"
            onClick={() => onCreateFolder({ parentId: null })}
          >
            <svg viewBox="0 0 14 12" width="12" height="10" fill="currentColor" aria-hidden="true">
              <path d="M1 2a1 1 0 011-1h4l1.5 2H13a1 1 0 011 1v6a1 1 0 01-1 1H2a1 1 0 01-1-1V2z" />
              <path d="M7 5v4M5 7h4" stroke="#fff" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            New folder
          </button>
        </div>
      )}
      <ul className="folder-tree__root">
        {rootCards.map((card) => (
          <li key={card.id} className={`folder-tree__file-row folder-tree__file-row--root${card.id === highlightedCardId ? ' folder-tree__file-row--highlighted' : ''}`}>
            <FileIcon />
            <span className="folder-tree__file-name">{card.title || '(untitled)'}</span>
            {onOpenAsPortal && (
              <button
                type="button"
                className="folder-tree__open-btn"
                aria-label={`Open ${card.title || '(untitled)'} in tab`}
                onClick={() => onOpenAsPortal(card.id)}
              >
                ↗
              </button>
            )}
          </li>
        ))}
        {tree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            cardsByFolderId={cardsByFolderId}
            onCreateFolder={onCreateFolder}
            onOpenAsPortal={onOpenAsPortal}
            highlightedCardId={highlightedCardId}
          />
        ))}
      </ul>
    </div>
  )
}
