import { useState } from 'react'
import { buildFolderTree } from '../folder/createFolder'
import './FolderTree.css'

function FolderNode({ node, cardsByFolderId, onCreateFolder }) {
  const [expanded, setExpanded] = useState(true)
  const cards = cardsByFolderId[node.id] ?? []
  const hasChildren = node.children.length > 0 || cards.length > 0

  return (
    <li className="folder-tree__folder">
      <div className="folder-tree__folder-row">
        <button
          type="button"
          className={`folder-tree__toggle${!hasChildren ? ' folder-tree__toggle--empty' : ''}`}
          aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? '▾' : '▸'}
        </button>
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
      {expanded && (
        <ul className="folder-tree__children">
          {node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              cardsByFolderId={cardsByFolderId}
              onCreateFolder={onCreateFolder}
            />
          ))}
          {cards.map((card) => (
            <li key={card.id} className="folder-tree__card">
              {card.title || '(untitled)'}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

export function FolderTree({ folders = [], cards = [], onCreateFolder }) {
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
            + New folder
          </button>
        </div>
      )}
      <ul className="folder-tree__root">
        {rootCards.map((card) => (
          <li key={card.id} className="folder-tree__card folder-tree__card--root">
            {card.title || '(untitled)'}
          </li>
        ))}
        {tree.map((node) => (
          <FolderNode
            key={node.id}
            node={node}
            cardsByFolderId={cardsByFolderId}
            onCreateFolder={onCreateFolder}
          />
        ))}
      </ul>
    </div>
  )
}
