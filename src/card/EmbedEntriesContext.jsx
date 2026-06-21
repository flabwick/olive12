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

const EmbedActionsContext = createContext({ onSaveToShelf: null })

export function EmbedActionsProvider({ onSaveToShelf = null, children }) {
  return (
    <EmbedActionsContext.Provider value={{ onSaveToShelf }}>
      {children}
    </EmbedActionsContext.Provider>
  )
}

export function useEmbedActions() {
  return useContext(EmbedActionsContext)
}
