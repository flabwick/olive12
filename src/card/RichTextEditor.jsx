import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { markdownToHtml, htmlToMarkdown } from './richTextLogic'
import { useRichTextEditorContext } from './RichTextEditorContext'
import { EmbeddedCardNode } from './EmbeddedCardNode'
import './RichTextEditor.css'

export function RichTextEditor({
  value = '',
  onChange,
  editable = true,
  ariaLabel,
  placeholder = 'Write something…',
  cardId,
  editorSurface = 'tab',
}) {
  const { registerEditor, clearEditor } = useRichTextEditorContext()

  const editor = useEditor({
    extensions: [StarterKit, EmbeddedCardNode, Highlight, TaskList, TaskItem],
    content: markdownToHtml(value),
    editable,
    editorProps: {
      attributes: {
        ...(ariaLabel ? { 'aria-label': ariaLabel, role: 'textbox', 'aria-multiline': 'true' } : {}),
        'data-placeholder': placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(htmlToMarkdown(editor.getHTML()))
    },
  })

  // Sync external value changes (e.g. streaming) without disrupting active edits.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    if (editor.isFocused) return
    const current = htmlToMarkdown(editor.getHTML())
    if (current !== value) {
      editor.commands.setContent(markdownToHtml(value), false)
    }
  }, [value, editor])

  // Sync editable prop; auto-focus when becoming editable; clear from dock when not.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    editor.setEditable(editable)
    if (editable) {
      setTimeout(() => editor.commands.focus('end'), 0)
    } else {
      clearEditor(cardId)
    }
  }, [editor, editable, clearEditor, cardId])

  if (!editor) return null

  return (
    <div className={`rich-text-editor${editable ? ' rich-text-editor--editable' : ''}`}>
      <EditorContent
        editor={editor}
        className="rich-text-editor__content"
        onFocus={() => { if (editable) registerEditor(cardId, editorSurface, editor) }}
        onBlur={() => clearEditor(cardId)}
      />
    </div>
  )
}
