import { LibraryView } from './LibraryView'

const folders = [
  { id: 'f1', name: 'Work', parentId: null },
  { id: 'f2', name: 'Projects', parentId: 'f1' },
  { id: 'f3', name: 'Personal', parentId: null },
]

const cards = [
  { id: 'c1', title: 'Project plan', body: 'Q2 goals', folderId: 'f1', location: 'library' },
  { id: 'c2', title: 'Budget', body: '', folderId: 'f2', location: 'library' },
  { id: 'c3', title: 'Unfiled note', body: '', folderId: null, location: 'library' },
]

const tabs = [
  { id: 't1', name: 'Research', savedFolderId: 'f3', savedLocation: 'library' },
]

export default {
  title: 'Vault/LibraryView',
  component: LibraryView,
  args: {
    cards: [],
    tabs: [],
    folders: [],
    selected: new Set(),
    selectMode: false,
    openFolderIds: new Set(),
    onSelect: () => {},
    onItemClick: () => {},
    onFolderClick: () => {},
    onCreateFolder: () => {},
    onUploadCard: () => {},
    onToggleFolder: () => {},
  },
}

export const Empty = {}

export const WithFolders = {
  args: { folders, cards, tabs },
}

export const OpenFolder = {
  args: { folders, cards, tabs, openFolderIds: new Set(['f1']) },
}

export const SelectMode = {
  args: {
    folders,
    cards,
    tabs,
    openFolderIds: new Set(['f1']),
    selectMode: true,
    selected: new Set(['c1']),
  },
}
