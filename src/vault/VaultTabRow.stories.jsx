import { VaultTabRow } from './VaultTabRow'

const tab = {
  id: 'tab-1',
  name: 'Research tab',
  savedLocation: 'shelf',
  savedFolderId: null,
  createdAt: new Date('2024-03-15').getTime(),
  updatedAt: new Date('2024-03-15').getTime(),
}

export default {
  title: 'Vault/VaultTabRow',
  component: VaultTabRow,
  args: { tab, onOpen: () => {}, onMoveToLibrary: () => {} },
}

export const Default = {}

export const WithOpenOnly = {
  args: { onMoveToLibrary: undefined },
}

export const WithMoveOnly = {
  args: { onOpen: undefined },
}

export const NoActions = {
  args: { onOpen: undefined, onMoveToLibrary: undefined },
}

export const LibraryTab = {
  args: {
    tab: { ...tab, savedLocation: 'library' },
    onMoveToLibrary: undefined,
  },
}
