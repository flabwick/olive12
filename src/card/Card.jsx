import './Card.css'

export function Card({ title, body }) {
  return (
    <div className="card">
      <h3 className="card__title">{title}</h3>
      <p className="card__body">{body}</p>
    </div>
  )
}
