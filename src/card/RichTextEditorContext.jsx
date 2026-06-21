import { createContext, useCallback, useContext, useRef, useState } from 'react'

const Ctx = createContext({
  activeEditor: null,
  activeCardId: null,
  activeSurface: null,
  registerEditor: () => {},
  clearEditor: () => {},
})

export function RichTextEditorProvider({ children }) {
  const [activeEditor, setActiveEditor] = useState(null)
  const [activeCardId, setActiveCardId] = useState(null)
  const [activeSurface, setActiveSurface] = useState(null)
  const activeCardIdRef = useRef(null)

  const registerEditor = useCallback((cardId, surface, editor) => {
    activeCardIdRef.current = cardId
    setActiveCardId(cardId)
    setActiveSurface(surface)
    setActiveEditor(editor)
  }, [])

  const clearEditor = useCallback((cardId) => {
    if (activeCardIdRef.current !== cardId) return
    activeCardIdRef.current = null
    setActiveCardId(null)
    setActiveSurface(null)
    setActiveEditor(null)
  }, [])

  return (
    <Ctx.Provider value={{ activeEditor, activeCardId, activeSurface, registerEditor, clearEditor }}>
      {children}
    </Ctx.Provider>
  )
}

export function useRichTextEditorContext() {
  return useContext(Ctx)
}
