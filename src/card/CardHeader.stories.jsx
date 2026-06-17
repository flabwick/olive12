import { CardHeader } from './CardHeader'

export default {
  title: 'Card/CardHeader',
  component: CardHeader,
  args: {
    title: 'Meeting notes',
    folded: false,
    hidden: false,
    onToggleFold: () => {},
    onToggleHide: () => {},
  },
}

export const Default = {}

export const Folded = {
  args: {
    title: 'Collapsed card',
    folded: true,
  },
}

export const Hidden = {
  args: {
    title: 'Dimmed card',
    hidden: true,
  },
}

export const NoControls = {
  args: {
    title: 'Title only, no controls',
    onToggleFold: undefined,
    onToggleHide: undefined,
  },
}
