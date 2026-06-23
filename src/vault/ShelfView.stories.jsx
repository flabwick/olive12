import { ShelfView } from './ShelfView'

const cards = [
  { id: 'c1', title: 'Meeting notes', body: 'Agenda: sprint review', location: 'shelf' },
  { id: 'c2', title: 'Ideas', body: '', location: 'shelf' },
]

const tabs = [
  { id: 't1', name: 'Research tab', savedLocation: 'shelf' },
]

export default {
  title: 'Vault/ShelfView',
  component: ShelfView,
  args: {
    cards: [],
    tabs: [],
    selected: new Set(),
    selectMode: false,
    onSelect: () => {},
    onItemClick: () => {},
  },
}

export const Empty = {}

export const CardsOnly = {
  args: { cards },
}

export const TabsOnly = {
  args: { tabs },
}

export const Mixed = {
  args: { cards, tabs },
}

export const SelectMode = {
  args: { cards, tabs, selectMode: true, selected: new Set(['c1']) },
}
