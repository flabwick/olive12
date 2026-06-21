import { createContext, useContext, useState } from 'react'

const Ctx = createContext({ activeEditor: null, setActiveEditor: () => {} })

export function RichTextEditorProvider({ children }) {
  const [activeEditor, setActiveEditor] = useState(null)
  return <Ctx.Provider value={{ activeEditor, setActiveEditor }}>{children}</Ctx.Provider>
}

export function useRichTextEditorContext() {
  return useContext(Ctx)
}
