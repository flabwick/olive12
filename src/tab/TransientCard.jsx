import { useState } from 'react'
import './TransientCard.css'

const CARD_TYPES = [
  { id: 'text', label: 'Text', enabled: true },
  { id: 'process', label: 'Process', enabled: false },
  { id: 'portal', label: 'Portal', enabled: false },
  { id: 'container', label: 'Container', enabled: false },
]

export function TransientCard({ onSubmit, onDismiss }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit?.({ title, body })
  }

  return (
    <div className="transient-card" role="region" aria-label="New card">
      <div className="transient-card__header">
        <span className="transient-card__heading">New card</span>
        <button
          type="button"
          className="transient-card__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <div className="transient-card__type-row" role="group" aria-label="Card type">
        {CARD_TYPES.map((ct) => (
          <button
            key={ct.id}
            type="button"
            className={`transient-card__type${ct.id === 'text' ? ' transient-card__type--selected' : ''}`}
            disabled={!ct.enabled}
            aria-pressed={ct.id === 'text'}
            aria-label={ct.label}
          >
            {ct.label}
          </button>
        ))}
      </div>

      <form className="transient-card__form" onSubmit={handleSubmit}>
        <input
          className="transient-card__input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          aria-label="Title"
          autoFocus
        />
        <textarea
          className="transient-card__textarea"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Body"
          aria-label="Body"
          rows={3}
        />
        <div className="transient-card__actions">
          <button type="button" className="transient-card__cancel" onClick={onDismiss}>
            Cancel
          </button>
          <button type="submit" className="transient-card__submit">
            Add →
          </button>
        </div>
      </form>
    </div>
  )
}
