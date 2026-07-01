import { useState } from 'react'
import './AIPrompt.css'

export function AIPrompt({ onSubmit, onDismiss, loading = false, streaming = false, error = '' }) {
  const [text, setText] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSubmit?.(text.trim())
  }

  return (
    <form
      className="ai-prompt"
      onSubmit={handleSubmit}
      role="region"
      aria-label="Prompt"
    >
      <textarea
        className="ai-prompt__input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Optional — add instructions…"
        aria-label="Prompt input"
        rows={2}
        disabled={loading}
        autoFocus
      />
      {error && (
        <p className="ai-prompt__error" role="alert">
          {error}
        </p>
      )}
      <div className="ai-prompt__actions">
        <button
          type="button"
          className="ai-prompt__cancel"
          onClick={onDismiss}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="ai-prompt__submit"
          disabled={loading}
        >
          {loading && streaming ? (
            <span className="ai-prompt__spinner" aria-label="Streaming" aria-busy="true" />
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
