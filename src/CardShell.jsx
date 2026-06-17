import { useState } from 'react'
import { Card } from './card/Card'
import { useCards } from './card/useCards'
import './CardShell.css'

export default function CardShell() {
  const { cards, addCard } = useCards()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    addCard({ title, body })
    setTitle('')
    setBody('')
  }

  return (
    <div className="card-shell">
      <form className="card-shell__form" onSubmit={handleSubmit}>
        <input
          className="card-shell__input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          aria-label="Title"
        />
        <textarea
          className="card-shell__textarea"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Body"
          aria-label="Body"
          rows={3}
        />
        <button className="card-shell__button" type="submit">
          Add card
        </button>
      </form>

      <ul className="card-shell__list">
        {cards.map((card) => (
          <li key={card.id}>
            <Card title={card.title} body={card.body} />
          </li>
        ))}
      </ul>
    </div>
  )
}
