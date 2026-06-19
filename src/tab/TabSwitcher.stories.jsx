import { TabSwitcher } from './TabSwitcher'

export default {
  title: 'Tab/TabSwitcher',
  component: TabSwitcher,
  parameters: { layout: 'fullscreen' },
}

const TABS_SINGLE = [
  { id: 'tab-1', name: 'Research', order: 0, savedLocation: 'none', savedFolderId: null },
]

const TABS_MULTI = [
  { id: 'tab-1', name: 'Research', order: 0, savedLocation: 'none', savedFolderId: null },
  { id: 'tab-2', name: 'Project Notes', order: 1, savedLocation: 'shelf', savedFolderId: null },
  { id: 'tab-3', name: 'Archive', order: 2, savedLocation: 'library', savedFolderId: null },
]

const TABS_MANY = Array.from({ length: 8 }, (_, i) => ({
  id: `tab-${i}`,
  name: `Tab ${i + 1}`,
  order: i,
  savedLocation: 'none',
  savedFolderId: null,
}))

const sharedActions = {
  onSwitch: (tabId) => console.log('switch:', tabId),
  onClose: () => console.log('close'),
  onAdd: () => console.log('add'),
  onRemoveTab: (tabId) => console.log('remove:', tabId),
  onSaveTab: (tabId) => console.log('save:', tabId),
}

export const SingleTab = {
  args: {
    tabs: TABS_SINGLE,
    activeTabId: 'tab-1',
    tabEntries: { 'tab-1': [1, 2, 3] },
    ...sharedActions,
  },
}

export const MultipleTabs = {
  args: {
    tabs: TABS_MULTI,
    activeTabId: 'tab-1',
    tabEntries: { 'tab-1': [1, 2, 3], 'tab-2': [1], 'tab-3': [] },
    ...sharedActions,
  },
}

export const ManyTabsScroll = {
  args: {
    tabs: TABS_MANY,
    activeTabId: 'tab-3',
    tabEntries: Object.fromEntries(TABS_MANY.map((t, i) => [t.id, Array(i)])),
    ...sharedActions,
  },
}
