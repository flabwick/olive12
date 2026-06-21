import { useState } from 'react'
import './DockPrompt.css'

export function DockPrompt({ onSubmit, onDismiss, loading = false, streaming = false, error = '' }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = text.trim()
    if (trimmed) onSubmit?.(trimmed)
  }

  return (
    <form
      className="dock-prompt"
      onSubmit={handleSubmit}
      role="region"
      aria-label="Prompt"
    >
      <textarea
        className="dock-prompt__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a question or give a task…"
        aria-label="Prompt input"
        rows={2}
        disabled={loading}
        autoFocus
      />
      {error && (
        <p className="dock-prompt__error" role="alert">
          {error}
        </p>
      )}
      <div className="dock-prompt__actions">
        <button
          type="button"
          className="dock-prompt__cancel"
          onClick={onDismiss}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="dock-prompt__submit"
          disabled={loading || !text.trim()}
        >
          {loading && streaming ? (
            <span className="dock-prompt__spinner" aria-label="Streaming" aria-busy="true" />
          ) : loading ? (
            'Thinking…'
          ) : (
            'Send →'
          )}
        </button>
      </div>
    </form>
  )
}
