import { VaultItemRow } from './VaultItemRow'

export default {
  title: 'Vault/VaultItemRow',
  component: VaultItemRow,
  args: {
    type: 'card',
    title: 'Meeting notes',
    onClick: () => {},
  },
}

export const Card = {}

export const Tab = {
  args: { type: 'tab', title: 'Research tab' },
}

export const Highlighted = {
  args: { highlighted: true },
}

export const Active = {
  args: { active: true },
}

export const Selected = {
  args: { selected: true, selectMode: true, onSelect: () => {} },
}

export const SelectMode = {
  args: { selectMode: true, selected: false, onSelect: () => {} },
}

export const Nested = {
  args: { depth: 2, title: 'Nested card' },
}
