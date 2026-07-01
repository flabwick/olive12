import { useState } from 'react'
import './CardHeader.css'

function CaretIcon({ folded }) {
  return (
    <svg
      className={`card-header__caret-icon${folded ? ' card-header__caret-icon--folded' : ''}`}
      viewBox="0 0 10 6"
      width="12"
      height="7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 1l4 4 4-4" />
    </svg>
  )
}

function EyeIcon({ hidden }) {
  if (hidden) {
    return (
      <svg viewBox="-1 -1 18 14" width="14" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 2l12 8" />
        <path d="M6.5 3.5C7 3.2 7.5 3 8 3c2 0 5 2 7 5-.6.9-1.3 1.7-2 2.3" />
        <path d="M3.3 4.7C2.5 5.3 1.7 6.1 1 7c2 3 5 5 7 5 1 0 2-.3 3-.8" />
        <circle cx="8" cy="7" r="2" />
      </svg>
    )
  }
  return (
    <svg viewBox="-1 -1 18 12" width="14" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 5C3 2 6 0 8 0s5 2 7 5c-2 3-5 5-7 5S3 8 1 5z" />
      <circle cx="8" cy="5" r="2" />
    </svg>
  )
}

function SaveIcon() {
  return (
    <svg viewBox="0 0 10 12" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 1h6v10l-3-2-3 2z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.5 5.5l2.5 2.5 5-5" />
    </svg>
  )
}

function SendToTabIcon() {
  return (
    <svg viewBox="0 0 10 12" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="1" x2="9" y2="1" />
      <path d="M5 11V4M2 6.5l3-3 3 3" />
    </svg>
  )
}

function MoveToDockIcon() {
  return (
    <svg viewBox="0 0 10 12" width="10" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="1" y1="11" x2="9" y2="11" />
      <path d="M5 1v7M2 5.5l3 3 3-3" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 10 10" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M1 1l8 8M9 1l-8 8" />
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg viewBox="0 0 12 10" width="13" height="11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 3H10M8 1l2 2-2 2" />
      <path d="M10 7H2M4 5l-2 2 2 2" />
    </svg>
  )
}

function StackNavChevron({ direction }) {
  const path = direction === 'left' ? 'M5 1L1 4l4 3' : 'M1 1l4 3-4 3'
  return (
    <svg viewBox="0 0 6 8" width="7" height="9" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

function StackLayersIcon() {
  return (
    <svg viewBox="0 0 13 12" width="12" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="9" height="7" rx="1" />
      <rect x="1" y="1.5" width="9" height="7" rx="1" />
    </svg>
  )
}

function CollapseStackIcon() {
  return (
    <svg viewBox="0 0 12 10" width="12" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7l4-4 4 4" />
    </svg>
  )
}

export function CardHeader({
  title,
  editing = false,
  onTitleChange,
  onTitleBlur,
  onTitleKeyDown,
  inputRef,
  onTitleClick,
  folded = false,
  hidden = false,
  selected = false,
  location = 'none',
  onSaveToShelf,
  onToggleFold,
  onToggleHide,
  onToggleSelect,
  onFlip,
  onSendToTab,
  onSendToDock,
  onClose,
  cycleIndex,
  cycleTotal,
  onCyclePrev,
  onCycleNext,
  stackExpanded = false,
  onToggleStackExpand,
}) {
  const [pendingClose, setPendingClose] = useState(false)
  const hasControls = onSaveToShelf || onToggleHide || onFlip || onSendToTab || onSendToDock || onClose
  const showCycle = !editing && cycleTotal > 1 && onCyclePrev && onCycleNext
  const showStackNav = !editing && (showCycle || onToggleStackExpand)

  return (
    <div className="card-header">
      {onToggleSelect && (
        <label className="card-header__select" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            className="card-header__select-input"
            aria-label="Select card"
            checked={selected}
            onChange={() => onToggleSelect()}
          />
        </label>
      )}
      {onToggleFold && (
        <button
          type="button"
          className="card-header__fold-toggle"
          onClick={onToggleFold}
          aria-label={folded ? 'Expand card' : 'Collapse card'}
        >
          <CaretIcon folded={folded} />
        </button>
      )}
      {editing ? (
        <input
          ref={inputRef}
          className="card-header__title-input"
          value={title}
          onChange={(e) => onTitleChange?.(e.target.value)}
          onBlur={onTitleBlur}
          onKeyDown={onTitleKeyDown}
          aria-label="Card title"
        />
      ) : (
        <h3
          className={`card-header__title${onTitleClick ? ' card-header__title--editable' : ''}`}
          onClick={onTitleClick}
          onMouseDown={onTitleClick ? (e) => e.stopPropagation() : undefined}
          tabIndex={onTitleClick ? 0 : undefined}
          onKeyDown={onTitleClick ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onTitleClick()
            }
          } : undefined}
        >
          {title || (onTitleClick ? <span className="card-header__title-placeholder">Untitled</span> : null)}
        </h3>
      )}

      {showStackNav && (
        <div className="card-header__stack-nav" role="group" aria-label="Stack navigation">
          {showCycle && (
            <>
              <button
                type="button"
                className="card-header__stack-btn"
                onClick={onCyclePrev}
                aria-label="Previous card"
              >
                <StackNavChevron direction="left" />
              </button>
              <span
                className="card-header__stack-count"
                aria-label={`Card ${cycleIndex} of ${cycleTotal}`}
              >
                {cycleIndex}/{cycleTotal}
              </span>
              <button
                type="button"
                className="card-header__stack-btn"
                onClick={onCycleNext}
                aria-label="Next card"
              >
                <StackNavChevron direction="right" />
              </button>
            </>
          )}
          {onToggleStackExpand && (
            <button
              type="button"
              className={`card-header__stack-btn card-header__stack-btn--expand${showCycle ? '' : ' card-header__stack-btn--solo'}`}
              onClick={onToggleStackExpand}
              aria-label={stackExpanded ? 'Collapse stack' : 'Expand stack'}
              aria-pressed={stackExpanded}
            >
              {stackExpanded ? <CollapseStackIcon /> : <StackLayersIcon />}
            </button>
          )}
        </div>
      )}

      {hasControls && (
        <div className="card-header__controls">
          {pendingClose ? (
            <>
              <span className="card-header__delete-warning">Delete forever?</span>
              <button
                type="button"
                className="card-header__control card-header__control--confirm-delete"
                onClick={onClose}
                aria-label="Confirm delete"
              >
                <CloseIcon />
              </button>
              <button
                type="button"
                className="card-header__control"
                onClick={() => setPendingClose(false)}
                aria-label="Cancel delete"
              >
                ‹
              </button>
            </>
          ) : (
          <>
          {onSaveToShelf && (
            location !== 'none' ? (
              <button
                type="button"
                className="card-header__control card-header__control--saved"
                aria-label="Saved"
                disabled
              >
                <CheckIcon />
              </button>
            ) : (
              <button
                type="button"
                className="card-header__control"
                onClick={onSaveToShelf}
                aria-label="Save card"
              >
                <SaveIcon />
              </button>
            )
          )}
          {onToggleHide && (
            <button
              type="button"
              className="card-header__control"
              onClick={onToggleHide}
              aria-label={hidden ? 'Show card' : 'Dim card'}
            >
              <EyeIcon hidden={hidden} />
            </button>
          )}
          {onSendToTab && (
            <button
              type="button"
              className="card-header__control"
              onClick={onSendToTab}
              aria-label="Move to tab"
            >
              <SendToTabIcon />
            </button>
          )}
          {onSendToDock && (
            <button
              type="button"
              className="card-header__control"
              onClick={onSendToDock}
              aria-label="Move to dock"
            >
              <MoveToDockIcon />
            </button>
          )}
          {onFlip && (
            <button
              type="button"
              className="card-header__control"
              onClick={onFlip}
              aria-label="Flip card"
            >
              <FlipIcon />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              className="card-header__control card-header__control--close"
              onClick={() => setPendingClose(true)}
              aria-label="Remove card"
            >
              <CloseIcon />
            </button>
          )}
          </>
          )}
        </div>
      )}
    </div>
  )
}
