import { SelectionBar } from './SelectionBar'

export default {
  title: 'Stack/SelectionBar',
  component: SelectionBar,
  args: {
    onCreateStack: () => {},
    onClear: () => {},
  },
}

export const OneSelected = {
  args: { count: 1 },
}

export const TwoSelected = {
  args: { count: 2 },
}

export const ManySelected = {
  args: { count: 7 },
}

export const WithMove = {
  args: {
    count: 3,
    onMove: () => {},
  },
}

export const DisabledCreateStack = {
  args: { count: 1 },
}
