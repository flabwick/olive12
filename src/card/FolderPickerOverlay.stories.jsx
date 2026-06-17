import { FolderPickerOverlay } from './FolderPickerOverlay'

export default {
  title: 'Card/FolderPickerOverlay',
  component: FolderPickerOverlay,
  args: {
    onSelect: () => {},
    onDismiss: () => {},
  },
}

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
  { id: 'f2', name: 'Notes', parentId: null, createdAt: 2, updatedAt: 2 },
  { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
  { id: 'f4', name: 'Archive', parentId: null, createdAt: 4, updatedAt: 4 },
]

export const NoFolders = {
  args: { folders: [] },
}

export const WithFolders = {
  args: { folders },
}
