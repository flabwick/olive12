import { FolderTree } from './FolderTree'

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
  { id: 'f2', name: 'Personal', parentId: null, createdAt: 2, updatedAt: 2 },
  { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
]

const cards = [
  { id: 'c1', title: 'Meeting notes', folderId: null },
  { id: 'c2', title: 'Q3 goals', folderId: 'f1' },
  { id: 'c3', title: 'Roadmap', folderId: 'f3' },
  { id: 'c4', title: 'Books to read', folderId: 'f2' },
]

export default {
  title: 'Vault/FolderTree',
  component: FolderTree,
  args: { folders, cards, onCreateFolder: () => {} },
}

export const Default = {}

export const Empty = {
  args: { folders: [], cards: [] },
}

export const NoCreateFolder = {
  args: { onCreateFolder: undefined },
}
