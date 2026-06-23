import { InlineRename } from './InlineRename'

export default {
  title: 'Vault/InlineRename',
  component: InlineRename,
  args: {
    value: 'My folder',
    onCommit: () => {},
    onCancel: () => {},
  },
}

export const Default = {}

export const LongName = {
  args: { value: 'A very long folder name that might overflow the container' },
}
