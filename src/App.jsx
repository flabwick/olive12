import { useState } from 'react'
import { Tab } from './tab/Tab'
import { useTabs } from './tab/useTabs'
import './App.css'

function App() {
  const { entries, addCard, fold, unfold, hide, unhide } = useTabs()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    addCard({ title, body })
    setTitle('')
    setBody('')
  }

  return (
    <div className="app-shell">
      <form className="app-shell__form" onSubmit={handleSubmit}>
        <input
          className="app-shell__input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          aria-label="Title"
        />
        <textarea
          className="app-shell__textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Body"
          aria-label="Body"
          rows={3}
        />
        <button className="app-shell__button" type="submit">
          Add card
        </button>
      </form>

      <Tab entries={entries} onFold={fold} onUnfold={unfold} onHide={hide} onUnhide={unhide} />
    </div>
  )
}

export default App
