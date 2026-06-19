import { ShelfRow } from './ShelfRow'

const card = {
  id: 'c1',
  title: 'Meeting notes from Monday standup',
  type: 'text',
  body: 'Some body text',
  location: 'shelf',
  folderId: null,
  createdAt: new Date('2024-03-15').getTime(),
  updatedAt: new Date('2024-03-15').getTime(),
}

const folders = [
  { id: 'f1', name: 'Work', parentId: null, createdAt: 1, updatedAt: 1 },
  { id: 'f2', name: 'Personal', parentId: null, createdAt: 2, updatedAt: 2 },
  { id: 'f3', name: 'Projects', parentId: 'f1', createdAt: 3, updatedAt: 3 },
]

export default {
  title: 'Vault/ShelfRow',
  component: ShelfRow,
  args: { card, folders, onMoveToLibrary: () => {} },
}

export const Default = {}

export const NoAction = {
  args: { onMoveToLibrary: undefined },
}

export const WithFolders = {
  args: { folders },
}

export const WithOpenAsPortal = {
  args: { onOpenAsPortal: () => {} },
}

export const WithAllActions = {
  args: { onMoveToLibrary: () => {}, onOpenAsPortal: () => {} },
}

export const NoActions = {
  args: { onMoveToLibrary: undefined, onOpenAsPortal: undefined },
}
