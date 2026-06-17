import Dexie from 'dexie'

export const db = new Dexie('olive12')

db.version(1).stores({
  cards: 'id',
  tabs: 'id',
  tab_cards: '[tabId+cardId], tabId',
})
