import { useState } from 'react'
import { Card } from '../card/Card'
import { FileCard } from '../card/FileCard'
import './DockCardPanel.css'

export function DockCardPanel({ card, cardId, onClose, onUpdate, onMoveToTab }) {
  const [foldState, setFoldState] = useState(false)

  if (!card) return null

  const sharedProps = {
    cardId,
    location: card.location || 'none',
    foldState,
    onToggleFold: () => setFoldState((v) => !v),
    onClose,
    onUpdate: (fields) => onUpdate(cardId, fields),
    onSendToTab: onMoveToTab,
  }

  if (card.type === 'file') {
    return (
      <div className="dock-card-panel" role="complementary" aria-label="Dock card">
        <FileCard
          title={card.title}
          fileName={card.fileName}
          fileType={card.fileType}
          fileSize={card.fileSize}
          {...sharedProps}
        />
      </div>
    )
  }

  return (
    <div className="dock-card-panel" role="complementary" aria-label="Dock card">
      <Card
        title={card.title}
        body={card.body}
        back={card.back || ''}
        {...sharedProps}
        editorSurface="dock"
      />
    </div>
  )
}
