import { TabHeader } from './TabHeader'

export default {
  title: 'Tab/TabHeader',
  component: TabHeader,
  parameters: { layout: 'padded' },
}

export const Default = {
  args: {
    name: 'Research',
    savedLocation: 'none',
    onRename: (name) => console.log('rename:', name),
    onSaveToShelf: () => console.log('save to shelf'),
  },
}

export const SavedToShelf = {
  args: {
    name: 'Project Notes',
    savedLocation: 'shelf',
    onRename: (name) => console.log('rename:', name),
    onSaveToShelf: () => console.log('save to shelf'),
    onMoveToLibrary: () => console.log('move to library'),
  },
}

export const InLibrary = {
  args: {
    name: 'Archived Research',
    savedLocation: 'library',
    onRename: (name) => console.log('rename:', name),
    onSaveToShelf: () => console.log('save to shelf'),
    onMoveToLibrary: () => console.log('move to library'),
  },
}

export const NoSaveButton = {
  args: {
    name: 'Ephemeral Tab',
    savedLocation: 'none',
    onRename: (name) => console.log('rename:', name),
  },
}
