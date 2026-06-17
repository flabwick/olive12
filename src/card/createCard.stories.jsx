import { Card } from './Card'
import { createCard } from './createCard'

export default {
  title: 'Card/createCard',
}

export const Default = {
  render: () => {
    const card = createCard({
      title: 'Welcome',
      body: 'This card was created with createCard().',
    })

    return <Card title={card.title} body={card.body} />
  },
}

export const Empty = {
  render: () => {
    const card = createCard()

    return (
      <pre style={{ textAlign: 'left', fontSize: '0.875rem' }}>
        {JSON.stringify(card, null, 2)}
      </pre>
    )
  },
}

export const WithContent = {
  render: () => {
    const card = createCard({
      title: 'Ideas',
      body: 'Sketch out the card model\nAdd stories and tests',
    })

    return <Card title={card.title} body={card.body} />
  },
}
