import { useRichTextEditorContext } from '../card/RichTextEditorContext'
import { TOOLBAR_ITEMS } from '../card/RichTextEditor'
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

function ArrowRightIcon() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <path d="M1 6H13M8 1L13 6L8 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg width="13" height="15" viewBox="0 0 13 15" fill="none" aria-hidden="true">
      <path d="M6.5 14V8M3 1H10L9 5H4L3 1ZM4 5L2 8H11L9 5H4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function FormattingToolbar({ activeEditor, lightningActive, onLightningToggle, onSettings, extraButton }) {
  return (
    <>
      {TOOLBAR_ITEMS.map((btn, i) =>
        btn === null ? (
          <span key={`sep-${i}`} className="dock__sep" aria-hidden="true" />
        ) : (
          <button
            key={btn.key}
            type="button"
            className={`dock__btn${activeEditor && btn.isActive(activeEditor) ? ' dock__btn--active' : ''}`}
            title={btn.title}
            aria-label={btn.title}
            aria-pressed={activeEditor ? btn.isActive(activeEditor) : false}
            onMouseDown={(e) => {
              e.preventDefault()
              if (activeEditor) btn.action(activeEditor)
            }}
          >
            {btn.label}
          </button>
        )
      )}
      <span className="dock__sep" aria-hidden="true" />
      <button
        type="button"
        className={`dock__btn${lightningActive ? ' dock__btn--active' : ''}`}
        aria-label="AI prompt"
        aria-pressed={lightningActive}
        onMouseDown={(e) => { e.preventDefault(); onLightningToggle?.() }}
      >
        <LightningIcon />
      </button>
      {extraButton}
      <button
        type="button"
        className="dock__btn"
        aria-label="Settings"
        onClick={onSettings}
      >
        <MenuIcon />
      </button>
    </>
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
  onMoveDockCardToTab,
  onMoveToDock,
  lightningActive = false,
  onLightningToggle,
}) {
  const { activeEditor } = useRichTextEditorContext()

  if (dockState === DOCK_STATE.DOCK_EDITOR) {
    return (
      <div className="dock dock--formatting" role="toolbar" aria-label="Formatting options">
        <FormattingToolbar
          activeEditor={activeEditor}
          lightningActive={lightningActive}
          onLightningToggle={onLightningToggle}
          onSettings={onSettings}
          extraButton={
            <button
              type="button"
              className="dock__btn"
              aria-label="Move card to tab"
              onClick={onMoveDockCardToTab}
            >
              <ArrowRightIcon />
            </button>
          }
        />
      </div>
    )
  }

  if (dockState === DOCK_STATE.TAB_EDITOR) {
    return (
      <div className="dock dock--formatting" role="toolbar" aria-label="Formatting options">
        <FormattingToolbar
          activeEditor={activeEditor}
          lightningActive={lightningActive}
          onLightningToggle={onLightningToggle}
          onSettings={onSettings}
          extraButton={
            <button
              type="button"
              className="dock__btn"
              aria-label="Pin to dock"
              onClick={onMoveToDock}
            >
              <PinIcon />
            </button>
          }
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
        <button
          type="button"
          className="dock__btn"
          aria-label="Pin new card"
          onClick={onAddDockCard}
        >
          +
        </button>
      </div>
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
