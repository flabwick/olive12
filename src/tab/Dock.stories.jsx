import { Dock } from './Dock'

export default {
  title: 'Tab/Dock',
  component: Dock,
  parameters: { layout: 'fullscreen' },
  args: {
    onAdd: () => {},
    addDisabled: false,
  },
}

export const Default = {}

export const Disabled = {
  args: { addDisabled: true },
}
