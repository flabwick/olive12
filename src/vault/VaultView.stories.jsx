import { VaultView } from './VaultView'

export default {
  title: 'Vault/VaultView',
  component: VaultView,
  args: {
    onChangeView: () => {},
    onAddCard: () => {},
    onUpdateCard: () => {},
    onRemoveCard: () => {},
    onReorder: () => {},
    onFold: () => {},
    onUnfold: () => {},
    onHide: () => {},
    onUnhide: () => {},
    onSaveToShelf: () => {},
    onMoveToLibrary: () => {},
    tabEntries: [],
    shelfEntries: [],
    libraryEntries: [],
  },
}

const makeTabEntry = (id, title, body, overrides = {}) => ({
  card: { id, title, body, type: 'text', location: 'none' },
  position: 0,
  foldState: false,
  hiddenState: false,
  ...overrides,
})

const makeShelfCard = (id, title, body) => ({
  id, title, body, type: 'text', location: 'shelf',
  createdAt: Date.now(), updatedAt: Date.now(),
})

const makeLibraryCard = (id, title, body) => ({
  id, title, body, type: 'text', location: 'library',
  createdAt: Date.now(), updatedAt: Date.now(),
})

export const DefaultTabView = {
  args: {
    view: 'tab',
    tabEntries: [
      makeTabEntry('a', 'Meeting notes', 'Discuss roadmap and next steps.', { position: 0 }),
      makeTabEntry('b', 'Shopping list', 'Milk\nEggs\nBread', { position: 1 }),
    ],
  },
}

export const TabViewEmpty = {
  args: {
    view: 'tab',
    tabEntries: [],
  },
}

export const ShelfWithCards = {
  args: {
    view: 'shelf',
    shelfEntries: [
      makeShelfCard('s1', 'Research notes', 'Notes from the literature review.'),
      makeShelfCard('s2', 'Draft intro', 'The quick brown fox...'),
    ],
  },
}

export const ShelfEmpty = {
  args: {
    view: 'shelf',
    shelfEntries: [],
  },
}

export const LibraryWithCards = {
  args: {
    view: 'library',
    libraryEntries: [
      makeLibraryCard('l1', 'Product spec v1', 'Final spec for the widget.'),
      makeLibraryCard('l2', 'Architecture decisions', 'We chose Dexie because...'),
    ],
  },
}

export const LibraryEmpty = {
  args: {
    view: 'library',
    libraryEntries: [],
  },
}
