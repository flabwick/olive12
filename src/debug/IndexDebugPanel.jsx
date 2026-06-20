import { useEffect, useState } from 'react'
import { clearIndexDebugEvents, subscribeIndexDebug } from './indexPipelineDebug'
import './IndexDebugPanel.css'

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function IndexDebugPanel({ open, onClose }) {
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('')

  useEffect(() => {
    return subscribeIndexDebug(setEvents)
  }, [])

  if (!open) return null

  const filtered = filter
    ? events.filter((e) => e.cardId?.includes(filter) || e.stage.includes(filter) || e.error?.includes(filter))
    : events

  return (
    <div className="index-debug-panel" role="dialog" aria-label="Index pipeline debug">
      <header className="index-debug-panel__header">
        <strong>Index pipeline</strong>
        <span className="index-debug-panel__count">{filtered.length} events</span>
        <input
          className="index-debug-panel__filter"
          type="search"
          placeholder="Filter card id / stage / error…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <button type="button" className="index-debug-panel__btn" onClick={() => clearIndexDebugEvents()}>
          Clear
        </button>
        <button type="button" className="index-debug-panel__btn" onClick={onClose} aria-label="Close debug panel">
          ✕
        </button>
      </header>
      <ol className="index-debug-panel__list">
        {filtered.length === 0 && (
          <li className="index-debug-panel__empty">No events yet — promote a card to library or flip it.</li>
        )}
        {filtered.map((e) => (
          <li key={e.id} className={`index-debug-panel__row index-debug-panel__row--${e.status}`}>
            <span className="index-debug-panel__time">{fmtTime(e.ts)}</span>
            <span className="index-debug-panel__stage">{e.stage}</span>
            <span className="index-debug-panel__status">{e.status}</span>
            {e.cardId && <code className="index-debug-panel__id">{e.cardId.slice(0, 8)}…</code>}
            {e.error && <span className="index-debug-panel__error">{e.error}</span>}
            {e.detail && (
              <pre className="index-debug-panel__detail">{JSON.stringify(e.detail, null, 0)}</pre>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
