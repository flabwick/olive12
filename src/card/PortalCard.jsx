import { Card } from './Card'
import { FileCard } from './FileCard'
import './PortalCard.css'
import { resolvePortalTarget } from './portalLogic'

export function PortalCard({
  config,
  cardsById = {},
  foldState = false,
  hiddenState = false,
  flipped = false,
  selected = false,
  location,
  folders,
  onToggleFold,
  onToggleHide,
  onFlip,
  onMoveUp,
  onMoveDown,
  onClose,
  onUpdate,
  onLocate,
  onToggleSelect,
  indexEntry,
  indexLoading = false,
}) {
  const target = resolvePortalTarget({ config }, cardsById)

  const locateBtn = target && onLocate ? (
    <button
      type="button"
      className="portal-card__locate"
      aria-label="Show in vault"
      onClick={onLocate}
    >
      <svg viewBox="0 0 10 8" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M1 4l3 3 5-6" />
      </svg>
    </button>
  ) : null

  if (target?.type === 'file') {
    return (
      <div className="portal-card">
        <FileCard
          title={target.title}
          fileName={target.fileName}
          fileType={target.fileType}
          fileSize={target.fileSize}
          cardId={target.id}
          location={location}
          foldState={foldState}
          hiddenState={hiddenState}
          selected={selected}
          onToggleFold={onToggleFold}
          onToggleHide={onToggleHide}
          onToggleSelect={onToggleSelect}
          onClose={onClose}
          onUpdate={onUpdate}
        />
        {locateBtn}
      </div>
    )
  }

  return (
    <div className="portal-card">
      <Card
        title={target ? target.title : 'Portal — no target'}
        body={target ? target.body : 'No card linked.'}
        back={target?.back ?? ''}
        cardId={target?.id}
        createdAt={target?.createdAt}
        updatedAt={target?.updatedAt}
        foldState={foldState}
        hiddenState={hiddenState}
        flipped={flipped}
        selected={selected}
        location={location}
        folders={folders}
        indexEntry={indexEntry}
        indexLoading={indexLoading}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onToggleSelect={onToggleSelect}
        onFlip={onFlip}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onUpdate={target ? onUpdate : undefined}
        onClose={onClose}
      />
      {locateBtn}
    </div>
  )
}
