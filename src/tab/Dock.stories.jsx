import { RichTextEditorProvider } from '../card/RichTextEditorContext'
import { DOCK_STATE } from './dockStateMachine'
import { Dock } from './Dock'

const SAMPLE_ENTRIES = [
  { cardId: 'c1', card: { id: 'c1', title: 'Meeting notes', body: '' } },
  { cardId: 'c2', card: { id: 'c2', title: 'Scratch', body: '' } },
  { cardId: 'c3', card: { id: 'c3', title: '', body: '' } },
]

export default {
  title: 'Tab/Dock',
  component: Dock,
  decorators: [(Story) => <RichTextEditorProvider><Story /></RichTextEditorProvider>],
  parameters: { layout: 'fullscreen' },
}

export const Base = {
  args: {
    dockState: DOCK_STATE.BASE,
    dockCardEntries: SAMPLE_ENTRIES,
    activeDockCardId: 'c1',
    onAddDockCard: () => {},
    onOpenDockCard: () => {},
    onFolderOpen: () => {},
    onSettings: () => {},
  },
}

export const DockEditor = {
  args: {
    dockState: DOCK_STATE.DOCK_EDITOR,
    lightningActive: false,
    onMoveDockCardToTab: () => {},
    onLightningToggle: () => {},
    onSettings: () => {},
  },
}

export const TabEditor = {
  args: {
    dockState: DOCK_STATE.TAB_EDITOR,
    lightningActive: true,
    onMoveToDock: () => {},
    onLightningToggle: () => {},
    onSettings: () => {},
  },
}
