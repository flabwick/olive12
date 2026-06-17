import { LocationButton } from './LocationButton'

export default {
  title: 'Card/LocationButton',
  component: LocationButton,
  args: {
    folders: [
      { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
      { id: 'f2', name: 'Notes', parentId: null, createdAt: 2, updatedAt: 2 },
      { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
    ],
    onSaveToShelf: () => {},
    onMoveToLibrary: () => {},
  },
}

export const AddButton = {
  args: { location: 'none' },
}

export const ShelfButton = {
  args: { location: 'shelf' },
}

export const LibraryButton = {
  args: { location: 'library' },
}

export const NoCallbacks = {
  args: { location: 'none', onSaveToShelf: undefined, onMoveToLibrary: undefined },
}
