import { useState } from 'react'
import { useRichTextEditorContext } from '../card/RichTextEditorContext'
import { DOCK_STATE } from './dockStateMachine'
import './Dock.css'

function FolderIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" aria-hidden="true">
      <path
        d="M1.5 11V3.5C1.5 2.948 1.948 2.5 2.5 2.5H6L7.5 4H12.5C13.052 4 13.5 4.448 13.5 5V11C13.5 11.552 13.052 12 12.5 12H2.5C1.948 12 1.5 11.552 1.5 11Z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
      />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="15" height="12" viewBox="0 0 15 12" fill="none" aria-hidden="true">
      <path d="M1 2H14M1 6H14M1 10H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function LightningIcon() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" aria-hidden="true">
      <path d="M6.5 1L1.5 8H6L5 14L11.5 6H7L6.5 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function HighlightIcon() {
  return (
    <svg width="12" height="11" viewBox="0 0 12 11" fill="none" aria-hidden="true">
      <path d="M2 7l4-6 4 4-3 4H4L2 7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <line x1="1" y1="10" x2="11" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IndentIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M1 4.5l2.5 1.5L1 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function OutdentIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="6" x2="13" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="10" x2="13" y2="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M4 4.5L1.5 6 4 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

function CheckboxIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M3.5 6l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CardBadgeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="10" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="3" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="3" y1="7.5" x2="7" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function TabBadgeIcon() {
  return (
    <svg width="13" height="11" viewBox="0 0 13 11" fill="none" aria-hidden="true">
      <path d="M1 10V3.5h3L5.5 1.5h6V10H1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function ShelfIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" aria-hidden="true">
      <path d="M1 10.5h12V7H1v3.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M1 7l2.5-6h7L13 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function LibraryIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <rect x="1" y="2.5" width="3" height="8.5" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="5" y="4" width="3" height="7" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9.5" y="1" width="3.5" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.4" />
      <line x1="1" y1="11.5" x2="13" y2="11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function DockPinIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" aria-hidden="true">
      <path d="M6.5 1v5M4.5 4.5l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="1" y="8" width="11" height="3.5" rx="0.75" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="12" height="13" viewBox="0 0 12 13" fill="none" aria-hidden="true">
      <path d="M1 3h10M4 3V2h4v1M2 3l.75 8h6.5L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function FolderArrowIcon() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" aria-hidden="true">
      <path
        d="M1.5 11V3.5C1.5 2.948 1.948 2.5 2.5 2.5H6L7.5 4H12.5C13.052 4 13.5 4.448 13.5 5V11C13.5 11.552 13.052 12 12.5 12H2.5C1.948 12 1.5 11.552 1.5 11Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
      />
      <path
        d="M5 8h4.5M8.5 6.5L10 8L8.5 9.5"
        stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function BrainIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 16 13" fill="none" aria-hidden="true">
      <circle cx="2.5" cy="3" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="2.5" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="13.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4 3.5l2.5 2M4 9.5l2.5-2M9.5 6.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function IconWithPlus({ Icon }) {
  return (
    <span className="dock__icon-plus">
      <Icon />
      <span className="dock__icon-plus__mark" aria-hidden="true">+</span>
    </span>
  )
}

function DockBtn({ active, danger, label, title, onMouseDown, onClick, children, ariaExpanded }) {
  const cls = [
    'dock__btn',
    active && 'dock__btn--active',
    danger && 'dock__btn--danger',
  ].filter(Boolean).join(' ')
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      aria-pressed={active !== undefined ? active : undefined}
      aria-expanded={ariaExpanded}
      title={title ?? label}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

const VAULT_TAB_ICONS = { shelf: ShelfIcon, library: LibraryIcon, brain: BrainIcon }

function VaultBrowseBar({ activeTab, onTabChange, onNewCard, onNewFolder, onClose }) {
  return (
    <>
      <div className="dock__vault-tab-group" role="group" aria-label="Vault section">
        {['shelf', 'library', 'brain'].map((tab) => {
          const Icon = VAULT_TAB_ICONS[tab]
          const label = tab.charAt(0).toUpperCase() + tab.slice(1)
          return (
            <button
              key={tab}
              type="button"
              className={`dock__vault-tab${activeTab === tab ? ' dock__vault-tab--active' : ''}`}
              aria-label={label}
              aria-pressed={activeTab === tab}
              onClick={() => onTabChange?.(tab)}
            >
              <Icon />
            </button>
          )
        })}
      </div>
      <div className="dock__vault-actions" role="toolbar" aria-label="Vault actions">
        <DockBtn label="New card" onClick={onNewCard}>
          <IconWithPlus Icon={CardBadgeIcon} />
        </DockBtn>
        {activeTab === 'library' && (
          <DockBtn label="New folder" onClick={onNewFolder}>
            <IconWithPlus Icon={FolderIcon} />
          </DockBtn>
        )}
      </div>
      <div className="dock__vault-dismiss">
        <DockBtn label="Close vault" onClick={onClose}>✕</DockBtn>
      </div>
    </>
  )
}

function FolderPickBar({ selectedVaultItem, onPickRoot, onCancel }) {
  const { item } = selectedVaultItem
  const name = item.title ?? item.name ?? '(untitled)'
  return (
    <>
      <div className="dock__vault-actions" role="toolbar" aria-label="Move to folder">
        <span className="dock__vault-item-icon"><FolderArrowIcon /></span>
        <span className="dock__vault-name" title={name}>{name}</span>
        <span className="dock__sep" aria-hidden="true" />
        <DockBtn label="Move to root" onClick={onPickRoot}>Root</DockBtn>
      </div>
      <div className="dock__vault-dismiss">
        <DockBtn label="Cancel move" onClick={onCancel}>‹</DockBtn>
      </div>
    </>
  )
}

function VaultSelectionBar({
  selectedVaultItem,
  onClear,
  onVaultAddToTab,
  onVaultAddToDock,
  onVaultMoveToLibrary,
  onVaultMoveToShelf,
  onVaultSwitchToTab,
  onVaultDeleteTab,
  onVaultDeleteCard,
  onVaultDeleteFolderRequest,
  onVaultPickFolder,
  onVaultStartInlineRename,
}) {
  const [mode, setMode] = useState('normal')
  const { item, type } = selectedVaultItem
  const name = item.title ?? item.name ?? '(untitled)'

  const TypeIcon = type === 'folder' ? FolderIcon : type === 'tab' ? TabBadgeIcon : CardBadgeIcon

  if (mode === 'confirm-delete-tab') {
    return (
      <>
        <div className="dock__vault-actions" role="toolbar" aria-label="Confirm remove tab">
          <span className="dock__vault-item-icon"><TabBadgeIcon /></span>
          <span className="dock__vault-name" title={name}>{name}</span>
          <span className="dock__sep" aria-hidden="true" />
          <span className="dock__vault-confirm-label">Remove?</span>
          <DockBtn label="Confirm remove tab" danger onClick={() => { onVaultDeleteTab?.(item.id); onClear() }}>
            <TrashIcon />
          </DockBtn>
        </div>
        <div className="dock__vault-dismiss">
          <DockBtn label="Cancel" onClick={() => setMode('normal')}>‹</DockBtn>
        </div>
      </>
    )
  }

  if (mode === 'confirm-delete-card') {
    return (
      <>
        <div className="dock__vault-actions" role="toolbar" aria-label="Confirm delete card">
          <span className="dock__vault-item-icon"><CardBadgeIcon /></span>
          <span className="dock__vault-name" title={name}>{name}</span>
          <span className="dock__sep" aria-hidden="true" />
          <span className="dock__vault-confirm-label">Delete permanently?</span>
          <DockBtn label="Confirm delete card" danger onClick={() => { onVaultDeleteCard?.(item.id); onClear() }}>
            <TrashIcon />
          </DockBtn>
        </div>
        <div className="dock__vault-dismiss">
          <DockBtn label="Cancel" onClick={() => setMode('normal')}>‹</DockBtn>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="dock__vault-actions" role="toolbar" aria-label="Vault item actions">
        <span className="dock__vault-item-icon"><TypeIcon /></span>
        <span className="dock__vault-name" title={name}>{name}</span>
        <span className="dock__sep" aria-hidden="true" />
        {type === 'card' && (
          <DockBtn label="Add to tab" onClick={() => { onVaultAddToTab?.(item.id); onClear() }}>↗</DockBtn>
        )}
        {type === 'card' && (
          <DockBtn label="Open in dock" onClick={() => { onVaultAddToDock?.(item.id) }}><DockPinIcon /></DockBtn>
        )}
        {type === 'card' && item.location === 'shelf' && (
          <DockBtn label="Move to library" onClick={() => { onVaultMoveToLibrary?.(item.id, null); onClear() }}>
            <IconWithPlus Icon={LibraryIcon} />
          </DockBtn>
        )}
        {type === 'card' && item.location === 'library' && (
          <DockBtn label="Move to shelf" onClick={() => { onVaultMoveToShelf?.(item.id); onClear() }}>
            <IconWithPlus Icon={ShelfIcon} />
          </DockBtn>
        )}
        {type === 'card' && (
          <DockBtn label="Rename card" onClick={() => { onVaultStartInlineRename?.(item.id, 'card'); onClear() }}><PencilIcon /></DockBtn>
        )}
        {type === 'card' && (
          <DockBtn label="Delete card" danger onClick={() => setMode('confirm-delete-card')}><TrashIcon /></DockBtn>
        )}
        {(type === 'card' || type === 'tab') && (
          <DockBtn label="Move to folder" onClick={() => onVaultPickFolder?.()}><FolderArrowIcon /></DockBtn>
        )}
        {type === 'tab' && (
          <DockBtn label="Switch to tab" onClick={() => { onVaultSwitchToTab?.(item.id); onClear() }}>→</DockBtn>
        )}
        {type === 'tab' && (
          <DockBtn label="Remove tab" onClick={() => setMode('confirm-delete-tab')}><TrashIcon /></DockBtn>
        )}
        {type === 'folder' && (
          <DockBtn label="Rename folder" onClick={() => { onVaultStartInlineRename?.(item.id, 'folder'); onClear() }}><PencilIcon /></DockBtn>
        )}
        {type === 'folder' && (
          <DockBtn label="Delete folder" danger onClick={() => onVaultDeleteFolderRequest?.(item.id)}><TrashIcon /></DockBtn>
        )}
      </div>
      <div className="dock__vault-dismiss">
        <DockBtn label="Back to vault" title="Back to vault" onClick={onClear}>‹</DockBtn>
      </div>
    </>
  )
}

function FormattingToolbar({
  activeEditor,
  lightningActive,
  onLightningToggle,
  onEmbedOpen,
}) {
  const [headingOpen, setHeadingOpen] = useState(false)

  function press(editorFn) {
    return (e) => {
      e.preventDefault()
      if (activeEditor) editorFn(activeEditor)
    }
  }

  function active(type, attrs) {
    return activeEditor ? activeEditor.isActive(type, attrs) : false
  }

  function indentListItem(e) {
    e.preventDefault()
    if (!activeEditor) return
    if (!activeEditor.chain().focus().sinkListItem('listItem').run()) {
      activeEditor.chain().focus().sinkListItem('taskItem').run()
    }
  }

  function outdentListItem(e) {
    e.preventDefault()
    if (!activeEditor) return
    if (!activeEditor.chain().focus().liftListItem('listItem').run()) {
      activeEditor.chain().focus().liftListItem('taskItem').run()
    }
  }

  return (
    <div className="dock__scroll">
      <DockBtn
        label="Exit editor"
        onClick={() => activeEditor?.commands.blur()}
      >
        ‹
      </DockBtn>

      <span className="dock__sep" aria-hidden="true" />

      <DockBtn
        active={lightningActive}
        label="AI prompt"
        onMouseDown={(e) => { e.preventDefault(); onLightningToggle?.() }}
      >
        <LightningIcon />
      </DockBtn>

      <DockBtn label="Embed card" title="Embed card [[ ]]" onMouseDown={(e) => { e.preventDefault(); onEmbedOpen?.() }}>
        {'[[]]'}
      </DockBtn>

      <span className="dock__sep" aria-hidden="true" />

      <DockBtn label="Undo" title="Undo (⌘Z)" onMouseDown={press(e => e.chain().focus().undo().run())}>↩</DockBtn>
      <DockBtn label="Redo" title="Redo (⇧⌘Z)" onMouseDown={press(e => e.chain().focus().redo().run())}>↪</DockBtn>

      <span className="dock__sep" aria-hidden="true" />

      <DockBtn
        active={active('heading')}
        label="Heading"
        ariaExpanded={headingOpen}
        onMouseDown={(e) => { e.preventDefault(); setHeadingOpen(v => !v) }}
      >
        H
      </DockBtn>
      {headingOpen && [1, 2, 3].map(level => (
        <DockBtn
          key={level}
          active={active('heading', { level })}
          label={`Heading ${level}`}
          onMouseDown={press(e => { e.chain().focus().toggleHeading({ level }).run(); setHeadingOpen(false) })}
        >
          {`H${level}`}
        </DockBtn>
      ))}

      <DockBtn active={active('bold')} label="Bold" title="Bold (⌘B)" onMouseDown={press(e => e.chain().focus().toggleBold().run())}>
        <strong>B</strong>
      </DockBtn>
      <DockBtn active={active('italic')} label="Italic" title="Italic (⌘I)" onMouseDown={press(e => e.chain().focus().toggleItalic().run())}>
        <em>I</em>
      </DockBtn>
      <DockBtn active={active('highlight')} label="Highlight" onMouseDown={press(e => e.chain().focus().toggleHighlight().run())}>
        <HighlightIcon />
      </DockBtn>
      <DockBtn active={active('codeBlock')} label="Code block" onMouseDown={press(e => e.chain().focus().toggleCodeBlock().run())}>
        {'</>'}
      </DockBtn>
      <DockBtn active={active('bulletList')} label="Bullet list" onMouseDown={press(e => e.chain().focus().toggleBulletList().run())}>•</DockBtn>
      <DockBtn active={active('orderedList')} label="Ordered list" onMouseDown={press(e => e.chain().focus().toggleOrderedList().run())}>1.</DockBtn>
      <DockBtn label="Indent" onMouseDown={indentListItem}><IndentIcon /></DockBtn>
      <DockBtn label="Outdent" onMouseDown={outdentListItem}><OutdentIcon /></DockBtn>
      <DockBtn active={active('taskList')} label="Checkbox list" onMouseDown={press(e => e.chain().focus().toggleTaskList().run())}>
        <CheckboxIcon />
      </DockBtn>
      <DockBtn active={active('strike')} label="Strikethrough" onMouseDown={press(e => e.chain().focus().toggleStrike().run())}>
        <s>S</s>
      </DockBtn>
    </div>
  )
}

export function Dock({
  dockState = DOCK_STATE.BASE,
  dockCardEntries = [],
  activeDockCardId = null,
  onAddDockCard,
  onOpenDockCard,
  onFolderOpen,
  onSettings,
  onEmbedOpen,
  lightningActive = false,
  onLightningToggle,
  vaultOpen = false,
  vaultTab = 'shelf',
  onVaultTabChange,
  onVaultNewCard,
  onVaultNewFolder,
  selectedVaultItem = null,
  onClearVaultItem,
  onVaultAddToTab,
  onVaultAddToDock,
  onVaultMoveToLibrary,
  onVaultMoveToShelf,
  onVaultSwitchToTab,
  onVaultDeleteTab,
  onVaultDeleteCard,
  onVaultDeleteFolderRequest,
  onVaultMoveToFolder,
  onVaultStartInlineRename,
  pickingFolder = false,
  onVaultPickFolder,
  onVaultPickFolderCancel,
}) {
  const { activeEditor } = useRichTextEditorContext()

  if (dockState === DOCK_STATE.DOCK_EDITOR || dockState === DOCK_STATE.TAB_EDITOR) {
    return (
      <div className="dock dock--formatting" role="toolbar" aria-label="Formatting options">
        <FormattingToolbar
          activeEditor={activeEditor}
          lightningActive={lightningActive}
          onLightningToggle={onLightningToggle}
          onEmbedOpen={onEmbedOpen}
        />
      </div>
    )
  }

  if (vaultOpen && !selectedVaultItem && dockState === DOCK_STATE.BASE) {
    return (
      <div className="dock dock--vault">
        <VaultBrowseBar
          activeTab={vaultTab}
          onTabChange={onVaultTabChange}
          onNewCard={onVaultNewCard}
          onNewFolder={onVaultNewFolder}
          onClose={onFolderOpen}
        />
      </div>
    )
  }

  if (pickingFolder && selectedVaultItem && dockState === DOCK_STATE.BASE) {
    return (
      <div className="dock dock--vault">
        <FolderPickBar
          selectedVaultItem={selectedVaultItem}
          onPickRoot={() => onVaultMoveToFolder?.(null)}
          onCancel={onVaultPickFolderCancel}
        />
      </div>
    )
  }

  if (selectedVaultItem && dockState === DOCK_STATE.BASE) {
    return (
      <div className="dock dock--vault">
        <VaultSelectionBar
          selectedVaultItem={selectedVaultItem}
          onClear={onClearVaultItem}
          onVaultAddToTab={onVaultAddToTab}
          onVaultAddToDock={onVaultAddToDock}
          onVaultMoveToLibrary={onVaultMoveToLibrary}
          onVaultMoveToShelf={onVaultMoveToShelf}
          onVaultSwitchToTab={onVaultSwitchToTab}
          onVaultDeleteTab={onVaultDeleteTab}
          onVaultDeleteCard={onVaultDeleteCard}
          onVaultDeleteFolderRequest={onVaultDeleteFolderRequest}
          onVaultPickFolder={onVaultPickFolder}
          onVaultStartInlineRename={onVaultStartInlineRename}
        />
      </div>
    )
  }

  // BASE state
  return (
    <div className="dock dock--base" role="toolbar" aria-label="Tab actions">
      <div className="dock__pills">
        {dockCardEntries.map((entry, i) => {
          const label = entry.card.title?.trim().slice(0, 14) || String(i + 1)
          return (
            <button
              key={entry.cardId}
              type="button"
              className={`dock__pill${activeDockCardId === entry.cardId ? ' dock__pill--active' : ''}`}
              onClick={() => onOpenDockCard?.(entry.cardId)}
              title={entry.card.title || undefined}
            >
              {label}
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="dock__btn dock__add-btn"
        aria-label="Pin new card"
        onClick={onAddDockCard}
      >
        +
      </button>
      <span className="dock__divider" aria-hidden="true" />
      <div className="dock__actions">
        <button
          type="button"
          className="dock__btn"
          aria-label="Library"
          onClick={onFolderOpen}
        >
          <FolderIcon />
        </button>
        <button
          type="button"
          className="dock__btn"
          aria-label="Settings"
          onClick={onSettings}
        >
          <MenuIcon />
        </button>
      </div>
    </div>
  )
}
