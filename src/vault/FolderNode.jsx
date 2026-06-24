import { InlineRename } from './InlineRename'
import './FolderNode.css'

function CaretIcon() {
  return (
    <svg width="7" height="8" viewBox="0 0 7 8" fill="none" aria-hidden="true">
      <path d="M1.5 1.5L5.5 4L1.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <path d="M1 3a1 1 0 0 1 1-1h3.5L7 4h5a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3z" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  )
}

export function FolderNode({
  folder,
  isOpen = false,
  onToggle,
  onClick,
  depth = 0,
  active = false,
  editing = false,
  checkConflict,
  onRenameCommit,
  onRenameCancel,
  children,
}) {
  return (
    <div className={`vault-folder-node${isOpen ? ' vault-folder-node--open' : ''}`} style={{ '--depth': depth }}>
      <div
        className={`vault-folder-node__row${active ? ' vault-folder-node__row--active' : ''}${editing ? ' vault-folder-node__row--editing' : ''}`}
        onClick={editing ? undefined : () => onClick?.(folder)}
      >
        <button
          className={`vault-folder-node__caret${isOpen ? ' vault-folder-node__caret--open' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle?.() }}
          aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
          aria-expanded={isOpen}
          tabIndex={editing ? -1 : 0}
        >
          <CaretIcon />
        </button>
        <span className="vault-folder-node__icon" aria-hidden="true">
          <FolderIcon />
        </span>
        {editing ? (
          <InlineRename
            value={folder.name}
            checkConflict={checkConflict}
            onCommit={onRenameCommit}
            onCancel={onRenameCancel}
          />
        ) : (
          <span className="vault-folder-node__name">{folder.name}</span>
        )}
      </div>
      {isOpen && children && (
        <div className="vault-folder-node__children">{children}</div>
      )}
    </div>
  )
}
