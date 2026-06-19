import { Tab } from './Tab'

const cardsById = {
  'target-1': {
    id: 'target-1',
    title: 'Referenced meeting notes',
    body: 'Key decisions: ship Q3 feature, defer auth redesign.',
    type: 'text',
    config: null,
  },
}

export default {
  title: 'Tab/Tab',
  component: Tab,
  args: {
    onFold: () => {},
    onUnfold: () => {},
    onHide: () => {},
    onUnhide: () => {},
    cardsById,
  },
}

const makeEntry = (id, title, body, overrides = {}) => ({
  card: { id, title, body, type: 'text', config: null },
  position: 0,
  foldState: false,
  hiddenState: false,
  ...overrides,
})

export const Empty = {
  args: { entries: [] },
}

export const MultipleCardsInOrder = {
  args: {
    entries: [
      makeEntry('a', 'First card', 'Content of the first card.', { position: 0 }),
      makeEntry('b', 'Second card', 'Content of the second card.', { position: 1 }),
      makeEntry('c', 'Third card', 'Content of the third card.', { position: 2 }),
    ],
  },
}

export const OneFolded = {
  args: {
    entries: [
      makeEntry('a', 'Normal card', 'This body is visible.', { position: 0 }),
      makeEntry('b', 'Folded card', 'This body is hidden.', { position: 1, foldState: true }),
      makeEntry('c', 'Another card', 'Also visible.', { position: 2 }),
    ],
  },
}

export const OneHidden = {
  args: {
    entries: [
      makeEntry('a', 'Visible card', 'I appear normally.', { position: 0 }),
      makeEntry('b', 'Dimmed card', 'I am rendered at reduced opacity.', {
        position: 1,
        hiddenState: true,
      }),
      makeEntry('c', 'Also visible', 'I appear normally too.', { position: 2 }),
    ],
  },
}

export const WithPortalCard = {
  args: {
    entries: [
      makeEntry('a', 'Text card', 'Regular content.', { position: 0 }),
      {
        card: {
          id: 'portal-1',
          type: 'portal',
          config: { target_card_id: 'target-1' },
          title: '',
          body: '',
          location: 'none',
        },
        position: 1,
        foldState: false,
        hiddenState: false,
      },
    ],
  },
}

export const WithUnresolvedPortal = {
  args: {
    entries: [
      {
        card: {
          id: 'portal-2',
          type: 'portal',
          config: { target_card_id: null },
          title: '',
          body: '',
          location: 'none',
        },
        position: 0,
        foldState: false,
        hiddenState: false,
      },
    ],
    cardsById: {},
  },
}
