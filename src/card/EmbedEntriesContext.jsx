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

const EmbedActionsContext = createContext({
  onSaveToShelf: null,
  onMoveToDock: null,
  onMoveToTab: null,
  onUpdate: null,
})

export function EmbedActionsProvider({
  onSaveToShelf = null,
  onMoveToDock = null,
  onMoveToTab = null,
  onUpdate = null,
  children,
}) {
  return (
    <EmbedActionsContext.Provider value={{ onSaveToShelf, onMoveToDock, onMoveToTab, onUpdate }}>
      {children}
    </EmbedActionsContext.Provider>
  )
}

export function useEmbedActions() {
  return useContext(EmbedActionsContext)
}
