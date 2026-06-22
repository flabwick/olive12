import { useState } from 'react'
import { Card } from '../card/Card'
import './DockCardPanel.css'

export function DockCardPanel({ card, cardId, onClose, onUpdate, onMoveToTab }) {
  const [foldState, setFoldState] = useState(false)

  if (!card) return null

  return (
    <div className="dock-card-panel" role="complementary" aria-label="Dock card">
      <Card
        cardId={cardId}
        title={card.title}
        body={card.body}
        back={card.back || ''}
        location={card.location || 'none'}
        foldState={foldState}
        onToggleFold={() => setFoldState((v) => !v)}
        onClose={onClose}
        onUpdate={(fields) => onUpdate(cardId, fields)}
        onSendToTab={onMoveToTab}
        editorSurface="dock"
      />
    </div>
  )
}
