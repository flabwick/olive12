import { Card } from '../card/Card'
import './DockCardPanel.css'

export function DockCardPanel({ card, cardId, onClose, onUpdate }) {
  if (!card) return null

  return (
    <div className="dock-card-panel" role="complementary" aria-label="Dock card">
      <div className="dock-card-panel__bar">
        <button
          type="button"
          className="dock-card-panel__close"
          aria-label="Close dock panel"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <div className="dock-card-panel__body">
        <Card
          cardId={cardId}
          title={card.title}
          body={card.body}
          back={card.back || ''}
          location={card.location || 'none'}
          onUpdate={(fields) => onUpdate(cardId, fields)}
          editorSurface="dock"
        />
      </div>
    </div>
  )
}
