import { useState } from 'react'
import './TransientCard.css'

const CARD_TYPES = [
  { id: 'text', label: 'Text', enabled: true },
  { id: 'process', label: 'Process', enabled: false },
  { id: 'portal', label: 'Portal', enabled: true },
  { id: 'container', label: 'Container', enabled: false },
]

export function TransientCard({ onSubmit, onDismiss, onSubmitPortal, shelfEntries = [], libraryEntries = [] }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [activeType, setActiveType] = useState('text')
  const [portalSearch, setPortalSearch] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit?.({ title, body })
  }

  function handleTypeClick(typeId) {
    if (CARD_TYPES.find((t) => t.id === typeId)?.enabled) {
      setActiveType(typeId)
      setPortalSearch('')
    }
  }

  const allVaultCards = [...shelfEntries, ...libraryEntries]
  const portalResults = portalSearch
    ? allVaultCards
        .filter((c) => c.title.toLowerCase().includes(portalSearch.toLowerCase()))
        .slice(0, 8)
    : []

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
            className={`transient-card__type${activeType === ct.id ? ' transient-card__type--selected' : ''}`}
            disabled={!ct.enabled}
            aria-pressed={activeType === ct.id}
            aria-label={ct.label}
            onClick={() => handleTypeClick(ct.id)}
          >
            {ct.label}
          </button>
        ))}
      </div>

      {activeType === 'text' && (
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
      )}

      {activeType === 'portal' && (
        <div className="transient-card__portal-search">
          <input
            className="transient-card__input"
            value={portalSearch}
            onChange={(e) => setPortalSearch(e.target.value)}
            placeholder="Search vault cards…"
            aria-label="Search vault cards"
            autoFocus
          />
          {portalResults.length > 0 && (
            <ul className="transient-card__portal-results" role="list">
              {portalResults.map((card) => (
                <li key={card.id}>
                  <button
                    type="button"
                    className="transient-card__portal-result"
                    onClick={() => onSubmitPortal?.(card.id)}
                  >
                    {card.title || '(untitled)'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {portalSearch && portalResults.length === 0 && (
            <p className="transient-card__portal-empty">No matching cards.</p>
          )}
        </div>
      )}
    </div>
  )
}
