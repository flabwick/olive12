import { Card } from './Card'
import './PortalCard.css'
import { resolvePortalTarget } from './portalLogic'

export function PortalCard({
  config,
  cardsById = {},
  foldState = false,
  hiddenState = false,
  flipped = false,
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
  indexEntry,
  indexLoading = false,
}) {
  const target = resolvePortalTarget({ config }, cardsById)

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
        location={location}
        folders={folders}
        indexEntry={indexEntry}
        indexLoading={indexLoading}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
        onFlip={onFlip}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onUpdate={target ? onUpdate : undefined}
        onClose={onClose}
      />
      {target && onLocate && (
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
      )}
    </div>
  )
}
