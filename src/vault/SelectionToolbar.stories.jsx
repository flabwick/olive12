import { SelectionToolbar } from './SelectionToolbar'

export default {
  title: 'Vault/SelectionToolbar',
  component: SelectionToolbar,
  args: {
    count: 3,
    onMove: () => {},
    onDelete: () => {},
    onDone: () => {},
  },
}

export const Default = {}

export const ZeroSelected = {
  args: { count: 0 },
}

export const ManySelected = {
  args: { count: 12 },
}
