import { Tab } from './Tab'

export default {
  title: 'Tab/Tab',
  component: Tab,
  args: {
    onFold: () => {},
    onUnfold: () => {},
    onHide: () => {},
    onUnhide: () => {},
  },
}

const makeEntry = (id, title, body, overrides = {}) => ({
  card: { id, title, body, type: 'text' },
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
