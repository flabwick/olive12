import { RichTextEditorProvider } from '../card/RichTextEditorContext'
import { DockCardPanel } from './DockCardPanel'

const SAMPLE_CARD = {
  id: 'c1',
  title: 'Meeting prep notes',
  body: 'Draft agenda for Thursday call',
  back: '',
  location: 'none',
}

export default {
  title: 'Tab/DockCardPanel',
  component: DockCardPanel,
  decorators: [(Story) => <RichTextEditorProvider><Story /></RichTextEditorProvider>],
  parameters: { layout: 'padded' },
}

export const WithCard = {
  args: {
    card: SAMPLE_CARD,
    cardId: 'c1',
    onClose: () => {},
    onUpdate: () => {},
  },
}

export const EmptyCard = {
  args: {
    card: { id: 'c2', title: '', body: '', back: '', location: 'none' },
    cardId: 'c2',
    onClose: () => {},
    onUpdate: () => {},
  },
}

export const NoCard = {
  args: {},
}
