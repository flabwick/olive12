import { Fragment, useEffect, useState } from 'react'
import { Card } from '../card/Card'

function LightningIcon() {
  return (
    <svg width="11" height="13" viewBox="0 0 13 15" fill="none" aria-hidden="true">
      <path d="M6.5 1L1.5 8H6L5 14L11.5 6H7L6.5 1Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
import { FileCard } from '../card/FileCard'
import { PortalCard } from '../card/PortalCard'
import { StackCard } from '../stack/StackCard'
import { AddCardButton } from './AddCardButton'
import './Tab.css'

export function Tab({
  entries = [],
  folders = [],
  cardsById = {},
  onReorder,
  onUpdate,
  onRemove,
  onFold,
  onUnfold,
  onHide,
  onUnhide,
  onSaveToShelf,
  onMoveToLibrary,
  onLocate,
  flipCard,
  isFlipped,
  selectedCardIds = new Set(),
  onToggleSelect,
  onAddToStack,
  onNestInTarget,
  moveCardId = null,
  onExitMoveMode,
  setStackTopCard,
  onReorderStackMember,
  onAddCard,
  onMoveToDock,
  onAIPrompt,
}) {
  const [focusCardId, setFocusCardId] = useState(null)

  useEffect(() => {
    if (!focusCardId) return
    const timer = setTimeout(() => setFocusCardId(null), 300)
    return () => clearTimeout(timer)
  }, [focusCardId])

  async function handleAddCard() {
    if (!onAddCard) return
    const card = await onAddCard()
    if (card?.id) setFocusCardId(card.id)
  }

  // Move mode: explicitly activated by clicking "Move" on a selected card
  const inMoveMode = moveCardId != null && entries.some((e) => e.card.id === moveCardId)
  const moveIndex = inMoveMode ? entries.findIndex((e) => e.card.id === moveCardId) : -1

  const tabActions = onAddCard ? (
    <div className="tab__actions-row">
      <button type="button" className="tab__ai-btn" aria-label="AI prompt" onClick={onAIPrompt}>
        <LightningIcon />
      </button>
      <AddCardButton onClick={handleAddCard} />
    </div>
  ) : null

  if (entries.length === 0) {
    return (
      <div className="tab tab--empty">
        <p className="tab__empty-message">No cards yet.</p>
        {tabActions}
      </div>
    )
  }

  return (
    <>
      <ul className="tab">
        {entries.map((entry, index) => {
          const isSelected = selectedCardIds.has(entry.card.id)
          const isMovingCard = entry.card.id === moveCardId
          const isMoveTarget = inMoveMode && !isMovingCard

          const sharedProps = {
            foldState: entry.foldState,
            hiddenState: entry.hiddenState,
            onToggleFold: entry.foldState ? () => onUnfold?.(entry.card.id) : () => onFold?.(entry.card.id),
            onToggleHide: entry.hiddenState ? () => onUnhide?.(entry.card.id) : () => onHide?.(entry.card.id),
            onClose: onRemove ? () => onRemove(entry.card.id) : undefined,
          }

          const indexProps = {
            indexEntry: entry.indexEntry,
            indexLoading: entry.indexLoading ?? false,
            location: entry.card.type === 'portal'
              ? (cardsById[entry.card.config?.target_card_id]?.location ?? 'none')
              : (entry.card.location ?? 'none'),
          }

          const selectionProps = {
            selected: isSelected,
            onToggleSelect: onToggleSelect ? () => onToggleSelect(entry.card.id) : undefined,
          }

          // Insert slots: skip the two positions adjacent to the moving card (they'd be no-ops)
          const showSlotBefore = inMoveMode && index !== moveIndex && index !== moveIndex + 1
          const slotToPosition = index <= moveIndex ? index : index - 1

          let cardElement

          if (entry.card.type === 'stack') {
            const memberIds = entry.card.config.memberIds
            const topCardId = entry.card.config.topCardId
            const topIndex = memberIds.indexOf(topCardId)
            const stackFlipped = isFlipped ? isFlipped(entry.card.id) : false
            cardElement = (
              <StackCard
                stack={entry.card}
                cardsById={cardsById}
                {...sharedProps}
                {...selectionProps}
                location={entry.card.location ?? 'none'}
                flipped={stackFlipped}
                onFlip={flipCard ? () => flipCard(entry.card.id) : undefined}
                onUpdate={onUpdate ? (fields) => onUpdate(entry.card.id, fields) : undefined}
                onSaveToShelf={onSaveToShelf ? () => onSaveToShelf(entry.card.id) : undefined}
                onUpdateMember={onUpdate}
                onSaveToShelfMember={onSaveToShelf}
                flipCard={flipCard}
                isFlipped={isFlipped}
                onCyclePrev={setStackTopCard && memberIds.length > 1 ? () => {
                  const prevId = memberIds[(topIndex - 1 + memberIds.length) % memberIds.length]
                  setStackTopCard(entry.card.id, prevId)
                } : undefined}
                onCycleNext={setStackTopCard && memberIds.length > 1 ? () => {
                  const nextId = memberIds[(topIndex + 1) % memberIds.length]
                  setStackTopCard(entry.card.id, nextId)
                } : undefined}
                onReorderMember={onReorderStackMember
                  ? (from, to) => onReorderStackMember(entry.card.id, from, to)
                  : undefined}
              />
            )
          } else if (entry.card.type === 'portal') {
            const targetId = entry.card.config?.target_card_id
            const target = targetId ? cardsById[targetId] : null
            const portalFlipped = isFlipped ? isFlipped(entry.card.id) : false
            cardElement = (
              <PortalCard
                config={entry.card.config}
                cardsById={cardsById}
                {...sharedProps}
                {...indexProps}
                {...selectionProps}
                flipped={portalFlipped}
                onFlip={flipCard ? () => flipCard(entry.card.id) : undefined}
                onUpdate={target && onUpdate ? (fields) => onUpdate(target.id, fields) : undefined}
                onLocate={target && onLocate ? () => onLocate(target.id) : undefined}
              />
            )
          } else if (entry.card.type === 'file') {
            cardElement = (
              <FileCard
                title={entry.card.title}
                fileName={entry.card.fileName}
                fileType={entry.card.fileType}
                fileSize={entry.card.fileSize}
                cardId={entry.card.id}
                {...sharedProps}
                {...indexProps}
                {...selectionProps}
                onUpdate={onUpdate ? (fields) => onUpdate(entry.card.id, fields) : undefined}
                onSaveToShelf={onSaveToShelf ? () => onSaveToShelf(entry.card.id) : undefined}
              />
            )
          } else {
            const cardFlipped = isFlipped ? isFlipped(entry.card.id) : false
            cardElement = (
              <Card
                title={entry.card.title}
                body={entry.card.body}
                back={entry.card.back ?? ''}
                cardId={entry.card.id}
                createdAt={entry.card.createdAt}
                updatedAt={entry.card.updatedAt}
                flipped={cardFlipped}
                onFlip={flipCard ? () => flipCard(entry.card.id) : undefined}
                {...sharedProps}
                {...indexProps}
                {...selectionProps}
                onUpdate={onUpdate ? (fields) => onUpdate(entry.card.id, fields) : undefined}
                onSaveToShelf={onSaveToShelf ? () => onSaveToShelf(entry.card.id) : undefined}
                onSendToDock={onMoveToDock ? () => onMoveToDock(entry.card.id) : undefined}
                autoFocus={entry.card.id === focusCardId}
              />
            )
          }

          return (
            <Fragment key={entry.card.id}>
              {showSlotBefore && (
                <li className="tab__slot">
                  <button
                    type="button"
                    className="tab__insert-btn"
                    onClick={() => {
                      onReorder?.(moveCardId, slotToPosition)
                      onExitMoveMode?.()
                    }}
                  >
                    Insert here
                  </button>
                </li>
              )}
              <li className="tab__item">
                {cardElement}

                {/* Stack affordance: other cards when move mode is active */}
                {isMoveTarget && (
                  <div className="tab__card-action">
                    {entry.card.type === 'stack' ? (
                      <button
                        type="button"
                        className="tab__card-action-btn tab__card-action-btn--stack"
                        onClick={() => {
                          onAddToStack?.(entry.card.id, moveCardId)
                          onExitMoveMode?.()
                        }}
                        aria-label={`Add to ${entry.card.title || 'stack'}`}
                      >
                        + Add to stack
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="tab__card-action-btn tab__card-action-btn--stack"
                        onClick={() => {
                          onNestInTarget?.(moveCardId, entry.card.id)
                          onExitMoveMode?.()
                        }}
                        aria-label={`Stack with ${entry.card.title || 'card'}`}
                      >
                        Stack with this
                      </button>
                    )}
                  </div>
                )}
              </li>
            </Fragment>
          )
        })}

        {/* Final insert slot: after all entries */}
        {inMoveMode && entries.length > moveIndex + 1 && (
          <li className="tab__slot">
            <button
              type="button"
              className="tab__insert-btn"
              onClick={() => {
                onReorder?.(moveCardId, entries.length - 1)
                onExitMoveMode?.()
              }}
            >
              Insert here
            </button>
          </li>
        )}
      </ul>
      {tabActions}
    </>
  )
}
