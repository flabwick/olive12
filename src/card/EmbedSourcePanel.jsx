import { useState } from 'react'
import './EmbedSourcePanel.css'

export function EmbedSourcePanel({ entries = [], onSelect, onClose }) {
  const [filter, setFilter] = useState('')

  const filtered = filter
    ? entries.filter((e) => e.title?.toLowerCase().includes(filter.toLowerCase()))
    : entries

  return (
    <div className="embed-source-panel" role="dialog" aria-label="Insert embed">
      <div className="embed-source-panel__header">
        <input
          className="embed-source-panel__search"
          type="search"
          placeholder="Search cards…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="Search cards to embed"
          autoFocus
        />
        <button
          type="button"
          className="embed-source-panel__cancel"
          onClick={onClose}
          aria-label="Cancel embed"
        >
          Cancel
        </button>
      </div>
      <ul className="embed-source-panel__list">
        {filtered.length === 0 ? (
          <li className="embed-source-panel__empty">No cards found.</li>
        ) : (
          filtered.map((e) => (
            <li key={e.id}>
              <button
                type="button"
                className="embed-source-panel__item"
                onClick={() => onSelect(e.id)}
              >
                {e.title || '(untitled)'}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
