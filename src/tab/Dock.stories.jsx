import { Dock } from './Dock'

export default {
  title: 'Tab/Dock',
  component: Dock,
  parameters: { layout: 'fullscreen' },
  args: {
    onAdd: () => {},
    addDisabled: false,
    onScrollTop: () => {},
    onFolder: () => {},
    onTabOverview: () => {},
    onMenu: () => {},
  },
}

export const Default = {}

export const AddDisabled = {
  args: { addDisabled: true },
}
