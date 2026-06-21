import { EmbedSourcePanel } from './EmbedSourcePanel'

const SAMPLE_ENTRIES = [
  { card: { id: 'c1', title: 'Meeting notes', body: 'Agenda items...' } },
  { card: { id: 'c2', title: 'Project plan', body: 'Timeline...' } },
  { card: { id: 'c3', title: 'Research notes', body: 'References...' } },
  { card: { id: 'c4', title: '', body: 'Untitled draft' } },
]

export default {
  title: 'Card/EmbedSourcePanel',
  component: EmbedSourcePanel,
  parameters: { layout: 'padded' },
}

export const WithEntries = {
  args: {
    entries: SAMPLE_ENTRIES,
    onSelect: () => {},
    onClose: () => {},
  },
}

export const Empty = {
  args: {
    entries: [],
    onSelect: () => {},
    onClose: () => {},
  },
}
