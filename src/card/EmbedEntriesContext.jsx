import { createContext, useContext } from 'react'

const EmbedEntriesContext = createContext([])

export function EmbedEntriesProvider({ entries = [], children }) {
  return (
    <EmbedEntriesContext.Provider value={entries}>
      {children}
    </EmbedEntriesContext.Provider>
  )
}

export function useEmbedEntries() {
  return useContext(EmbedEntriesContext)
}
