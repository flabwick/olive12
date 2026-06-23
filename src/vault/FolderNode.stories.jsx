import { FolderNode } from './FolderNode'
import { VaultItemRow } from './VaultItemRow'

const folder = { id: 'f1', name: 'Work', parentId: null }

export default {
  title: 'Vault/FolderNode',
  component: FolderNode,
  args: {
    folder,
    isOpen: false,
    depth: 0,
    onToggle: () => {},
    onClick: () => {},
  },
}

export const Closed = {}

export const Open = {
  args: {
    isOpen: true,
    children: (
      <>
        <VaultItemRow type="card" title="Meeting notes" onClick={() => {}} />
        <VaultItemRow type="card" title="Project plan" onClick={() => {}} />
      </>
    ),
  },
}

export const Nested = {
  args: {
    depth: 1,
    folder: { id: 'f2', name: 'Projects', parentId: 'f1' },
  },
}
