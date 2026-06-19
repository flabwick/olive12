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
})

// Version 3 migration used tx.tabs which is undefined in Dexie v4 (should be
// tx.table('tabs')). Fixing the migration itself in v3 doesn't help browsers
// that already ran the broken upgrade — so v4 re-runs the same populate step.
db.version(4).stores({
  cards: 'id',
  tabs: 'id',
  tab_cards: '[tabId+cardId], tabId',
  folders: 'id',
}).upgrade((tx) => {
  return tx.table('tabs').toCollection().modify((tab) => {
    if (tab.savedLocation === undefined) tab.savedLocation = 'none'
    if (tab.savedFolderId === undefined) tab.savedFolderId = null
  })
})
