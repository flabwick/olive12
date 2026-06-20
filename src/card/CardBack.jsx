import { useEffect, useLayoutEffect, useRef } from 'react'
import { getLastErrorForCard, logIndexEvent, INDEX_STAGES } from '../debug/indexPipelineDebug'
import './CardBack.css'

function autoResize(el) {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

function fmtDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function CardBack({
  back,
  editing,
  onBackChange,
  onFlip,
  cardId,
  createdAt,
  updatedAt,
  location = 'none',
  indexEntry,
  indexLoading = false,
  indexDebugOpen = true,
}) {
  const textareaRef = useRef(null)
  const showWiki = location === 'library'
  const lastError = cardId ? getLastErrorForCard(cardId) : null
  const loggedRef = useRef(null)

  useEffect(() => {
    if (editing) textareaRef.current?.focus()
  }, [editing])

  useLayoutEffect(() => {
    if (editing) autoResize(textareaRef.current)
  }, [editing, back])

  useEffect(() => {
    if (!cardId || loggedRef.current === `${location}:${!!indexEntry}:${indexLoading}`) return
    loggedRef.current = `${location}:${!!indexEntry}:${indexLoading}`
    logIndexEvent({
      stage: INDEX_STAGES.RENDER,
      cardId,
      status: 'info',
      detail: {
        location,
        showWiki,
        hasIndexEntry: !!indexEntry,
        title: indexEntry?.title ?? null,
        summaryLen: indexEntry?.summary?.length ?? 0,
        summaryPreview: indexEntry?.summary?.slice(0, 80) ?? null,
        indexLoading,
        lastError: lastError?.error ?? null,
      },
    })
  }, [cardId, location, showWiki, indexEntry, indexLoading, lastError])

  return (
    <div className="card-back">
      {!showWiki && (
        <p className="card-back__wiki-hint">
          Wiki index appears after promoting to library (current: {location})
        </p>
      )}

      {showWiki && (
        <section className="card-back__wiki" aria-label="Wiki index entry">
          <h3 className="card-back__wiki-heading">Index</h3>
          {indexLoading ? (
            <p className="card-back__wiki-loading">Indexing…</p>
          ) : indexEntry ? (
            <>
              {indexEntry.title && (
                <p className="card-back__wiki-title">{indexEntry.title}</p>
              )}
              {indexEntry.tags?.length > 0 && (
                <ul className="card-back__wiki-tags" aria-label="Tags">
                  {indexEntry.tags.map((tag) => (
                    <li key={tag} className="card-back__wiki-tag">{tag}</li>
                  ))}
                </ul>
              )}
              {indexEntry.summary ? (
                <p className="card-back__wiki-summary">{indexEntry.summary}</p>
              ) : (
                <p className="card-back__wiki-empty">No summary yet</p>
              )}
              {indexEntry.links?.length > 0 && (
                <p className="card-back__wiki-links">
                  Links: {indexEntry.links.join(', ')}
                </p>
              )}
            </>
          ) : (
            <p className="card-back__wiki-empty">No index entry yet</p>
          )}
        </section>
      )}

      {indexDebugOpen && cardId && (
        <details className="card-back__debug" open={!indexEntry && showWiki}>
          <summary>Index debug</summary>
          <dl className="card-back__debug-grid">
            <dt>cardId</dt>
            <dd>{cardId}</dd>
            <dt>location</dt>
            <dd>{location}{showWiki ? '' : ' (wiki hidden — need library)'}</dd>
            <dt>index in state</dt>
            <dd>{indexEntry ? 'yes' : 'no'}</dd>
            <dt>indexLoading</dt>
            <dd>{indexLoading ? 'yes' : 'no'}</dd>
            {indexEntry?.title && (
              <>
                <dt>index title</dt>
                <dd>{indexEntry.title}</dd>
              </>
            )}
            {indexEntry?.summary ? (
              <>
                <dt>summary</dt>
                <dd>{indexEntry.summary.slice(0, 120)}{indexEntry.summary.length > 120 ? '…' : ''}</dd>
              </>
            ) : indexEntry ? (
              <>
                <dt>summary</dt>
                <dd className="card-back__debug-error">empty</dd>
              </>
            ) : null}
            {lastError && (
              <>
                <dt>last error</dt>
                <dd className="card-back__debug-error">{lastError.error}</dd>
                <dt>failed at</dt>
                <dd>{lastError.stage}</dd>
              </>
            )}
          </dl>
        </details>
      )}

      <div className="card-back__notes">
        {editing ? (
          <textarea
            ref={textareaRef}
            className="card-back__notes-input"
            value={back}
            onChange={(e) => {
              onBackChange?.(e.target.value)
              autoResize(e.target)
            }}
            placeholder="Add notes…"
            aria-label="Card back"
          />
        ) : (
          <p className="card-back__notes-text">{back || <span className="card-back__notes-empty">No notes</span>}</p>
        )}
      </div>
      <dl className="card-back__meta">
        {createdAt != null && (
          <>
            <dt>Created</dt>
            <dd>{fmtDate(createdAt)}</dd>
          </>
        )}
        {updatedAt != null && (
          <>
            <dt>Updated</dt>
            <dd>{fmtDate(updatedAt)}</dd>
          </>
        )}
        {cardId && (
          <>
            <dt>ID</dt>
            <dd className="card-back__meta-id">{cardId}</dd>
          </>
        )}
      </dl>
      <button
        type="button"
        className="card-back__flip"
        aria-label="Flip to front"
        onClick={onFlip}
      >
        ↩
      </button>
    </div>
  )
}
