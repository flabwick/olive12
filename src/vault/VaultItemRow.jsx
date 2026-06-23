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

const TYPE_ICONS = { card: CardFileIcon, tab: TabFileIcon }

export function VaultItemRow({
  type,
  title,
  depth = 0,
  highlighted = false,
  active = false,
  selected = false,
  selectMode = false,
  onSelect,
  onClick,
}) {
  const cls = [
    'vault-item-row',
    highlighted && 'vault-item-row--highlighted',
    active && 'vault-item-row--active',
    selected && 'vault-item-row--selected',
    `vault-item-row--${type}`,
  ]
    .filter(Boolean)
    .join(' ')

  function handleClick() {
    if (selectMode) onSelect?.()
    else onClick?.()
  }

  const Icon = TYPE_ICONS[type] ?? CardFileIcon

  return (
    <div className={cls} style={{ '--depth': depth }} onClick={handleClick}>
      {selectMode ? (
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
      <span className="vault-item-row__name">{title}</span>
    </div>
  )
}
