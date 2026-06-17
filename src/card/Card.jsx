import { CardHeader } from './CardHeader'
import './Card.css'

export function Card({
  title,
  body,
  foldState = false,
  hiddenState = false,
  onToggleFold,
  onToggleHide,
}) {
  return (
    <div className={`card${hiddenState ? ' card--hidden' : ''}`}>
      <CardHeader
        title={title}
        folded={foldState}
        hidden={hiddenState}
        onToggleFold={onToggleFold}
        onToggleHide={onToggleHide}
      />
      {!foldState && <p className="card__body">{body}</p>}
    </div>
  )
}
