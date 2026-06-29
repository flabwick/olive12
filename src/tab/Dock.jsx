import { useEffect, useRef, useState } from 'react'
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

function ReorderIcon() {
  return (
    <svg width="10" height="13" viewBox="0 0 10 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 1v11M2 4l3-3 3 3M2 9l3 3 3-3" />
    </svg>
  )
}

function StackCardsIcon() {
  return (
    <svg width="13" height="12" viewBox="0 0 13 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="9" height="7" rx="1" />
      <rect x="1" y="1.5" width="9" height="7" rx="1" />
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

function FolderPlusIcon() {
  return (
    <svg width="16" height="14" viewBox="0 0 16 14" fill="none" aria-hidden="true">
      <path
        d="M1 11V4.5A1 1 0 012 3.5H5.5L7 5H13.5A1 1 0 0114.5 6V11A1 1 0 0113.5 12H2A1 1 0 011 11Z"
        stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"
      />
      <path d="M7.75 7.5v3M6.25 9h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function CardPlusIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none" aria-hidden="true">
      <rect x="1" y="2" width="11" height="11" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M6.5 5.5v5M4 8h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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

function DockBtn({ active, danger, primary, label, title, onMouseDown, onClick, children, ariaExpanded }) {
  const cls = [
    'dock__btn',
    active && 'dock__btn--active',
    danger && 'dock__btn--danger',
    primary && 'dock__btn--primary',
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
const VAULT_TAB_LABELS = { shelf: 'Inbox', library: 'Vault', brain: 'Index' }


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

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 9V1M4 4l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 11.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Dock({
  dockState = DOCK_STATE.BASE,
  dockCardEntries = [],
  activeDockCardId = null,
  onAddDockCard,
  onOpenDockCard,
  onCloseDockCard,
  onFolderOpen,
  onSettings,
  onEmbedOpen,
  onUploadFile,
  lightningActive = false,
  onLightningToggle,
  vaultOpen = false,
  vaultTab = 'shelf',
  onVaultTabChange,
  onVaultNewCard,
  onVaultNewFolder,
  selectedVaultItem = null,
  onClearVaultItem,
  onVaultAddToDock,
  onVaultSwitchToTab,
  onVaultDeleteTab,
  onVaultDeleteCard,
  onVaultDeleteFolderRequest,
  onVaultStartInlineRename,
  pickingFolder = false,
  onVaultPickFolder,
  onVaultPickFolderCancel,
  moveTarget = null,
  onConfirmMove,
  selectedCardCount = 0,
  selectedCardTitle = '',
  moveCardTitle = '',
  onEnterMoveMode,
  onExitMoveMode,
  onDockFromMove,
  onClearSelection,
  onCreateStack,
}) {
  const fileInputRef = useRef(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { activeEditor } = useRichTextEditorContext()

  useEffect(() => { setConfirmDelete(false) }, [selectedVaultItem])

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (file) onUploadFile?.(file)
    e.target.value = ''
  }

  function handleTabClick(tab) {
    onVaultTabChange?.(tab)
    if (!pickingFolder) onClearVaultItem?.()
    setConfirmDelete(false)
  }

  function pickDestLabel() {
    if (vaultTab === 'shelf') return 'Inbox'
    if (moveTarget) return moveTarget.name
    return 'Vault'
  }

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

  if (dockState === DOCK_STATE.CARD_MOVE) {
    return (
      <div className="dock dock--card-move" role="toolbar" aria-label="Move card">
        <span className="dock__card-name dock__card-name--moving" title={moveCardTitle}>
          {moveCardTitle || 'Card'}
        </span>
        <span className="dock__sep" aria-hidden="true" />
        {onDockFromMove && (
          <DockBtn label="Move to dock" onClick={onDockFromMove}>
            <DockPinIcon />
          </DockBtn>
        )}
        <span className="dock__sep" aria-hidden="true" />
        <DockBtn label="Cancel move" onClick={onExitMoveMode}>✕</DockBtn>
      </div>
    )
  }

  if (dockState === DOCK_STATE.CARD_SELECTED) {
    const label = selectedCardCount === 1
      ? (selectedCardTitle || 'Card')
      : `${selectedCardCount} selected`
    return (
      <div className="dock dock--card-selected" role="toolbar" aria-label="Card actions">
        <span className="dock__card-name" title={selectedCardCount === 1 ? selectedCardTitle : undefined}>
          {label}
        </span>
        <span className="dock__sep" aria-hidden="true" />
        {selectedCardCount === 1 && onEnterMoveMode && (
          <DockBtn label="Move in tab" onClick={onEnterMoveMode}>
            <ReorderIcon />
          </DockBtn>
        )}
        {selectedCardCount === 1 && onDockFromMove && (
          <DockBtn label="Move to dock" onClick={onDockFromMove}>
            <DockPinIcon />
          </DockBtn>
        )}
        {selectedCardCount >= 2 && onCreateStack && (
          <DockBtn label="Create stack" onClick={onCreateStack}>
            <StackCardsIcon />
          </DockBtn>
        )}
        <DockBtn label="AI prompt">
          <LightningIcon />
        </DockBtn>
        <span className="dock__sep" aria-hidden="true" />
        <DockBtn label="Clear selection" onClick={onClearSelection}>✕</DockBtn>
      </div>
    )
  }

  if (vaultOpen && dockState === DOCK_STATE.BASE) {
    const vaultItem = selectedVaultItem
    const item = vaultItem?.item
    const type = vaultItem?.type

    return (
      <div className="dock dock--vault">
        {/* Tab selectors — always visible across all vault substates */}
        <div className="dock__vault-tab-group" role="group" aria-label="Vault section">
          {['shelf', 'library', 'brain'].map((tab) => {
            const Icon = VAULT_TAB_ICONS[tab]
            return (
              <button
                key={tab}
                type="button"
                className={`dock__vault-tab${vaultTab === tab ? ' dock__vault-tab--active' : ''}`}
                aria-label={VAULT_TAB_LABELS[tab]}
                aria-pressed={vaultTab === tab}
                onClick={() => handleTabClick(tab)}
              >
                <Icon />
              </button>
            )
          })}
        </div>

        {/* Context-dependent center */}
        <div className="dock__vault-actions" role="toolbar" aria-label="Vault actions">
          {pickingFolder && vaultItem ? (
            // Folder pick mode
            <>
              <span className="dock__vault-name dock__vault-pick-dest">→ {pickDestLabel()}</span>
              <DockBtn primary label="Move here" onClick={onConfirmMove}>Move here</DockBtn>
            </>
          ) : confirmDelete && vaultItem ? (
            // Confirm delete
            <>
              <span className="dock__vault-confirm-label">Delete?</span>
              <DockBtn label="Confirm delete" onClick={() => {
                if (type === 'card') onVaultDeleteCard?.(item.id)
                else if (type === 'tab') onVaultDeleteTab?.(item.id)
                onClearVaultItem?.()
                setConfirmDelete(false)
              }}>
                <TrashIcon />
              </DockBtn>
            </>
          ) : vaultItem ? (
            // Item selected — simplified actions
            <>
              {type === 'card' && (
                <DockBtn label="Open" onClick={() => onVaultAddToDock?.(item.id)}>
                  <DockPinIcon />
                </DockBtn>
              )}
              {type === 'tab' && (
                <DockBtn label="Switch to tab" onClick={() => { onVaultSwitchToTab?.(item.id); onClearVaultItem?.() }}>→</DockBtn>
              )}
              {(type === 'card' || type === 'folder') && (
                <DockBtn label="Rename" onClick={() => { onVaultStartInlineRename?.(item.id, type); onClearVaultItem?.() }}>
                  <PencilIcon />
                </DockBtn>
              )}
              <DockBtn label="Move" onClick={() => onVaultPickFolder?.()}>
                <FolderArrowIcon />
              </DockBtn>
              <DockBtn label="Delete" onClick={() => {
                if (type === 'folder') onVaultDeleteFolderRequest?.(item.id)
                else setConfirmDelete(true)
              }}>
                <TrashIcon />
              </DockBtn>
            </>
          ) : (
            // Browse mode — add + upload actions per tab
            <>
              {vaultTab !== 'brain' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
                    onChange={handleFileChange}
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                  <DockBtn label="Upload file" onClick={() => fileInputRef.current?.click()}>
                    <UploadIcon />
                  </DockBtn>
                </>
              )}
              {vaultTab === 'shelf' && (
                <DockBtn label="New card" onClick={onVaultNewCard}>
                  <CardPlusIcon />
                </DockBtn>
              )}
              {vaultTab === 'library' && (
                <DockBtn label="New folder" onClick={onVaultNewFolder}>
                  <FolderPlusIcon />
                </DockBtn>
              )}
            </>
          )}
        </div>

        {/* Right: dismiss or back */}
        <div className="dock__vault-dismiss">
          {(vaultItem || pickingFolder) ? (
            <DockBtn label="Back" onClick={() => {
              if (pickingFolder) {
                onVaultPickFolderCancel?.()
              } else {
                onClearVaultItem?.()
                setConfirmDelete(false)
              }
            }}>‹</DockBtn>
          ) : (
            <DockBtn label="Close vault" onClick={onFolderOpen}>✕</DockBtn>
          )}
        </div>
      </div>
    )
  }

  // BASE state
  return (
    <div className="dock dock--base" role="toolbar" aria-label="Tab actions">
      <div className="dock__pills">
        {dockCardEntries.map((entry, i) => {
          const isActive = activeDockCardId === entry.cardId
          const label = entry.card.title?.trim().slice(0, 14) || String(i + 1)
          return (
            <button
              key={entry.cardId}
              type="button"
              className={`dock__pill${isActive ? ' dock__pill--active' : ''}`}
              onClick={() => isActive ? onCloseDockCard?.() : onOpenDockCard?.(entry.cardId)}
              title={entry.card.title || undefined}
              aria-label={isActive ? 'Close card panel' : undefined}
            >
              {isActive ? '✕' : label}
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
      <button
        type="button"
        className="dock__btn dock__lightning-btn"
        aria-label="AI prompt"
      >
        <LightningIcon />
      </button>
      <span className="dock__divider" aria-hidden="true" />
      <div className="dock__actions">
        {onUploadFile && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
              onChange={handleFileChange}
              aria-hidden="true"
              tabIndex={-1}
            />
            <button
              type="button"
              className="dock__btn"
              aria-label="Upload file"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon />
            </button>
          </>
        )}
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
