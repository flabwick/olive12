import { VaultContextMenu } from './VaultContextMenu'

const POSITION = { x: 120, y: 120 }

export default {
  title: 'Vault/VaultContextMenu',
  component: VaultContextMenu,
  args: {
    position: POSITION,
    onClose: () => {},
  },
}

export const Actions = {
  args: {
    items: [
      { type: 'action', label: 'Rename', onClick: () => {} },
      { type: 'action', label: 'Move to folder', onClick: () => {} },
      { type: 'divider' },
      { type: 'confirm', label: 'Delete', confirmLabel: 'Yes, delete', onClick: () => {} },
    ],
  },
}

export const FolderDelete = {
  args: {
    items: [
      { type: 'action', label: 'Rename folder', onClick: () => {} },
      { type: 'divider' },
      {
        type: 'confirm-two',
        label: 'Delete folder',
        choices: [
          { label: 'Reassign contents to parent', onClick: () => {} },
          { label: 'Delete all contents', onClick: () => {} },
        ],
      },
    ],
  },
}

export const WithSubmenu = {
  args: {
    items: [
      {
        type: 'submenu',
        label: 'Move to',
        items: [
          { label: 'Work', onClick: () => {} },
          { label: 'Personal', onClick: () => {} },
        ],
      },
    ],
  },
}
