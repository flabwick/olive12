import Dexie from 'dexie'

export const db = new Dexie('olive12')

db.version(1).stores({
  cards: 'id',
  tabs: 'id',
  tab_cards: '[tabId+cardId], tabId',
})

db.version(2).stores({
  cards: 'id',
  tabs: 'id',
  tab_cards: '[tabId+cardId], tabId',
  folders: 'id',
})

db.version(3).stores({
  cards: 'id',
  tabs: 'id',
  tab_cards: '[tabId+cardId], tabId',
  folders: 'id',
}).upgrade((tx) => {
  return tx.tabs.toCollection().modify((tab) => {
    if (tab.savedLocation === undefined) tab.savedLocation = 'none'
    if (tab.savedFolderId === undefined) tab.savedFolderId = null
  })
})
