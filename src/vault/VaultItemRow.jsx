import { InlineRename } from './InlineRename'
import './VaultItemRow.css'

function CardFileIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3 5h6M3 7.5h6M3 10h4" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  )
}

function TabFileIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="12" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 5h12" stroke="currentColor" strokeWidth="1"/>
      <path d="M4 2V1h4v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function FileAttachIcon() {
  return (
    <svg width="11" height="14" viewBox="0 0 11 14" fill="none" aria-hidden="true">
      <path
        d="M2 1h6l3 3v8.5a.5.5 0 01-.5.5H2a.5.5 0 01-.5-.5V1.5A.5.5 0 012 1z"
        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"
      />
      <path d="M8 1v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const TYPE_ICONS = { card: CardFileIcon, tab: TabFileIcon, file: FileAttachIcon }

export function VaultItemRow({
  type,
  title,
  depth = 0,
  highlighted = false,
  active = false,
  selected = false,
  selectMode = false,
  editing = false,
  checkConflict,
  onRenameCommit,
  onRenameCancel,
  onSelect,
  onClick,
}) {
  const cls = [
    'vault-item-row',
    highlighted && 'vault-item-row--highlighted',
    active && 'vault-item-row--active',
    selected && 'vault-item-row--selected',
    editing && 'vault-item-row--editing',
    `vault-item-row--${type}`,
  ]
    .filter(Boolean)
    .join(' ')

  function handleClick() {
    if (editing) return
    if (selectMode) onSelect?.()
    else onClick?.()
  }

  const Icon = TYPE_ICONS[type] ?? CardFileIcon

  return (
    <div className={cls} style={{ '--depth': depth }} onClick={handleClick}>
      {selectMode && !editing ? (
        <input
          type="checkbox"
          className="vault-item-row__checkbox"
          checked={selected}
          onChange={onSelect}
          aria-label={`Select ${title}`}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="vault-item-row__spacer" aria-hidden="true" />
      )}
      <span className="vault-item-row__icon" aria-hidden="true">
        <Icon />
      </span>
      {editing ? (
        <InlineRename
          value={title}
          checkConflict={checkConflict}
          onCommit={onRenameCommit}
          onCancel={onRenameCancel}
        />
      ) : (
        <span className="vault-item-row__name">{title}</span>
      )}
    </div>
  )
}
