import { PortalCard } from './PortalCard'

const cardsById = {
  'target-1': {
    id: 'target-1',
    title: 'Meeting notes',
    body: 'Discuss roadmap and next steps for Q3.',
    type: 'text',
    config: null,
  },
}

export default {
  title: 'Card/PortalCard',
  component: PortalCard,
  args: {
    config: { target_card_id: 'target-1' },
    cardsById,
    foldState: false,
    hiddenState: false,
    onToggleFold: () => {},
    onToggleHide: () => {},
    onMoveUp: () => {},
    onMoveDown: () => {},
    onClose: () => {},
    onUpdate: () => {},
    onLocate: () => {},
  },
}

export const Default = {}

export const Unresolved = {
  args: {
    config: { target_card_id: null },
  },
}

export const Folded = {
  args: {
    foldState: true,
  },
}

export const Hidden = {
  args: {
    hiddenState: true,
  },
}

export const NoControls = {
  args: {
    onToggleFold: undefined,
    onToggleHide: undefined,
    onMoveUp: undefined,
    onMoveDown: undefined,
    onClose: undefined,
    onLocate: undefined,
  },
}

export const WithLocate = {
  args: {
    onLocate: () => {},
  },
}
