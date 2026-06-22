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

function DockBtn({ active, label, title, onMouseDown, onClick, children, ariaExpanded }) {
  return (
    <button
      type="button"
      className={`dock__btn${active ? ' dock__btn--active' : ''}`}
      aria-label={label}
      aria-pressed={active !== undefined ? active : undefined}
      aria-expanded={ariaExpanded}
      title={title}
      onMouseDown={onMouseDown}
      onClick={onClick}
    >
      {children}
    </button>
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
