import { CardHeader } from './CardHeader'

export default {
  title: 'Card/CardHeader',
  component: CardHeader,
  args: {
    title: 'Meeting notes',
    folded: false,
    hidden: false,
    flipped: false,
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

export const AllControls = {
  args: {
    title: 'All controls — flip between eye and close',
    onFlip: () => {},
    onClose: () => {},
  },
}

export const FlipActive = {
  args: {
    title: 'Flip button active (showing back)',
    onFlip: () => {},
    onClose: () => {},
    flipped: true,
  },
}

export const FlipOnly = {
  args: {
    title: 'Flip only — no move arrows, no eye, no close',
    onToggleFold: undefined,
    onToggleHide: undefined,
    onMoveUp: undefined,
    onMoveDown: undefined,
    onFlip: () => {},
  },
}

export const HiddenCard = {
  args: {
    title: 'Hidden card — eye fully visible',
    hidden: true,
    onToggleHide: () => {},
    onFlip: () => {},
    onClose: () => {},
  },
}

export const SendToDock = {
  args: {
    title: 'Card with move-to-dock button',
    onSendToDock: () => {},
    onToggleHide: () => {},
    onClose: () => {},
  },
}
