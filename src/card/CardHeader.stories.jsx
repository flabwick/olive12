import { CardHeader } from './CardHeader'

export default {
  title: 'Card/CardHeader',
  component: CardHeader,
  args: {
    title: 'Meeting notes',
    folded: false,
    hidden: false,
    editing: false,
    onToggleFold: () => {},
    onToggleHide: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
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

export const FirstCard = {
  args: {
    title: 'First card — no up arrow',
    onMoveUp: undefined,
  },
}

export const LastCard = {
  args: {
    title: 'Last card — no down arrow',
    onMoveDown: undefined,
  },
}

export const Editing = {
  args: {
    title: 'Editable title',
    editing: true,
    onTitleChange: () => {},
  },
}

export const NoControls = {
  args: {
    title: 'Title only, no controls',
    onToggleFold: undefined,
    onToggleHide: undefined,
    onMoveUp: undefined,
    onMoveDown: undefined,
  },
}
