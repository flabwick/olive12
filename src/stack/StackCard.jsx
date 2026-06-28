import { useEffect, useRef, useState } from 'react'
import { Card } from '../card/Card'
import { FileCard } from '../card/FileCard'
import { CardBack } from '../card/CardBack'
import { CardHeader } from '../card/CardHeader'
import './StackCard.css'

// Renders a single member card (Card, FileCard, or nested StackCard) with its full UI.
function MemberCard({
  card,
  cardsById,
  foldState,
  onToggleFold,
  onUpdate,
  onSaveToShelf,
  flipped,
  onFlip,
  onUpdateMember,
  onSaveToShelfMember,
  flipCard,
  isFlipped,
}) {
  if (!card) return <p className="stack-card__missing">Card not found</p>

  const sharedProps = {
    foldState,
    onToggleFold,
    onUpdate,
    onSaveToShelf,
    location: card.location ?? 'none',
  }

  if (card.type === 'stack') {
    return (
      // eslint-disable-next-line no-use-before-define
      <StackCard
        stack={card}
        cardsById={cardsById}
        {...sharedProps}
        flipped={flipped}
        onFlip={onFlip}
        onUpdateMember={onUpdateMember}
        onSaveToShelfMember={onSaveToShelfMember}
        flipCard={flipCard}
        isFlipped={isFlipped}
      />
    )
  }

  if (card.type === 'file') {
    return (
      <FileCard
        title={card.title}
        fileName={card.fileName}
        fileType={card.fileType}
        fileSize={card.fileSize}
        cardId={card.id}
        {...sharedProps}
      />
    )
  }

  return (
    <Card
      title={card.title}
      body={card.body}
      back={card.back ?? ''}
      cardId={card.id}
      flipped={flipped}
      onFlip={onFlip}
      {...sharedProps}
    />
  )
}

export function StackCard({
  stack,
  cardsById = {},
  foldState = false,
  hiddenState = false,
  flipped = false,
  selected = false,
  location = 'none',
  onToggleFold,
  onToggleHide,
  onToggleSelect,
  onClose,
  onFlip,
  onUpdate,
  onSaveToShelf,
  onCyclePrev,
  onCycleNext,
  onReorderMember,
  onDissolve,
  // Member card callbacks — passed from Tab
  onUpdateMember,
  onSaveToShelfMember,
  flipCard,
  isFlipped,
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(stack.title)
  const titleInputRef = useRef(null)
  const [memberFoldStates, setMemberFoldStates] = useState({})

  useEffect(() => {
    if (!editing) setDraftTitle(stack.title)
  }, [stack.title, editing])

  useEffect(() => {
    if (editing) {
      titleInputRef.current?.focus()
      titleInputRef.current?.select()
    }
  }, [editing])

  function commitTitle(e) {
    if (e?.currentTarget?.contains(e.relatedTarget)) return
    setEditing(false)
    const trimmed = draftTitle.trim()
    if (trimmed !== stack.title) onUpdate?.({ title: trimmed })
    else setDraftTitle(stack.title)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      setEditing(false)
      const trimmed = draftTitle.trim()
      if (trimmed !== stack.title) onUpdate?.({ title: trimmed })
    }
    if (e.key === 'Escape') {
      setEditing(false)
      setDraftTitle(stack.title)
    }
  }

  function toggleMemberFold(cardId) {
    setMemberFoldStates((prev) => ({ ...prev, [cardId]: !prev[cardId] }))
  }

  const memberIds = stack.config.memberIds
  const topCardId = stack.config.topCardId
  const topCard = topCardId ? cardsById[topCardId] : null
  const topIndex = memberIds.indexOf(topCardId)

  const classNames = [
    'stack-card',
    hiddenState && 'stack-card--hidden',
    flipped && 'stack-card--flipped',
    expanded && 'stack-card--expanded',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={classNames}
      onBlur={editing ? commitTitle : undefined}
      onKeyDown={editing ? handleKeyDown : undefined}
    >
      <CardHeader
        title={editing ? draftTitle : stack.title}
        editing={editing}
        onTitleChange={setDraftTitle}
        inputRef={titleInputRef}
        onTitleClick={onUpdate ? () => setEditing(true) : undefined}
        folded={foldState}
        hidden={hiddenState}
        selected={selected}
        onToggleSelect={onToggleSelect}
        location={location}
        onSaveToShelf={onSaveToShelf}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onFlip={onFlip}
        onClose={onClose}
      />

      {!foldState && (
        <>
          {flipped ? (
            <CardBack
              back={stack.back ?? ''}
              editing={false}
              onFlip={onFlip}
              cardId={stack.id}
              createdAt={stack.createdAt}
              updatedAt={stack.updatedAt}
              location={location}
            />
          ) : (
            <>
              {expanded ? (
                <div className="stack-card__members">
                  {memberIds.map((id, index) => {
                    const card = cardsById[id]
                    const memberFold = memberFoldStates[id] ?? false
                    return (
                      <div key={id} className="stack-card__member-wrap">
                        <div className="stack-card__embed">
                          <MemberCard
                            card={card}
                            cardsById={cardsById}
                            foldState={memberFold}
                            onToggleFold={() => toggleMemberFold(id)}
                            onUpdate={onUpdateMember ? (fields) => onUpdateMember(id, fields) : undefined}
                            onSaveToShelf={onSaveToShelfMember ? () => onSaveToShelfMember(id) : undefined}
                            flipped={isFlipped ? isFlipped(id) : false}
                            onFlip={flipCard ? () => flipCard(id) : undefined}
                            onUpdateMember={onUpdateMember}
                            onSaveToShelfMember={onSaveToShelfMember}
                            flipCard={flipCard}
                            isFlipped={isFlipped}
                          />
                        </div>
                        {onReorderMember && (
                          <div className="stack-card__reorder-bar">
                            <button
                              type="button"
                              className="stack-card__reorder-btn"
                              onClick={() => onReorderMember(index, index - 1)}
                              disabled={index === 0}
                              aria-label="Move up"
                            >▲</button>
                            <button
                              type="button"
                              className="stack-card__reorder-btn"
                              onClick={() => onReorderMember(index, index + 1)}
                              disabled={index === memberIds.length - 1}
                              aria-label="Move down"
                            >▼</button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {onDissolve && (
                    <button
                      type="button"
                      className="stack-card__dissolve"
                      onClick={onDissolve}
                      aria-label="Dissolve stack"
                    >
                      Dissolve
                    </button>
                  )}
                </div>
              ) : topCard ? (
                <>
                  <div className="stack-card__embed">
                    <MemberCard
                      card={topCard}
                      cardsById={cardsById}
                      foldState={memberFoldStates[topCardId] ?? false}
                      onToggleFold={() => toggleMemberFold(topCardId)}
                      onUpdate={onUpdateMember ? (fields) => onUpdateMember(topCardId, fields) : undefined}
                      onSaveToShelf={onSaveToShelfMember ? () => onSaveToShelfMember(topCardId) : undefined}
                      flipped={isFlipped ? isFlipped(topCardId) : false}
                      onFlip={flipCard ? () => flipCard(topCardId) : undefined}
                      onUpdateMember={onUpdateMember}
                      onSaveToShelfMember={onSaveToShelfMember}
                      flipCard={flipCard}
                      isFlipped={isFlipped}
                    />
                  </div>
                  {memberIds.length > 0 && (
                    <div className="stack-card__cycle-controls">
                      <button
                        type="button"
                        className="stack-card__cycle-btn"
                        onClick={onCyclePrev}
                        aria-label="Previous card"
                        disabled={memberIds.length <= 1}
                      >
                        ‹
                      </button>
                      <span
                        className="stack-card__cycle-count"
                        aria-label={`Card ${topIndex + 1} of ${memberIds.length}`}
                      >
                        {topIndex + 1}/{memberIds.length}
                      </span>
                      <button
                        type="button"
                        className="stack-card__cycle-btn"
                        onClick={onCycleNext}
                        aria-label="Next card"
                        disabled={memberIds.length <= 1}
                      >
                        ›
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="stack-card__empty">No cards</p>
              )}

              <button
                type="button"
                className="stack-card__expand-toggle"
                onClick={() => setExpanded((e) => !e)}
                aria-label={expanded ? 'Collapse stack' : 'Expand stack'}
              >
                {expanded ? 'Collapse' : `${memberIds.length} card${memberIds.length !== 1 ? 's' : ''}`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
