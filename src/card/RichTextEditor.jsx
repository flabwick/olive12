import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { markdownToHtml, htmlToMarkdown } from './richTextLogic'
import { useRichTextEditorContext } from './RichTextEditorContext'
import './RichTextEditor.css'

export const TOOLBAR_ITEMS = [
  { key: 'bold',       label: 'B',   title: 'Bold (⌘B)',     action: (e) => e.chain().focus().toggleBold().run(),                 isActive: (e) => e.isActive('bold') },
  { key: 'italic',     label: 'I',   title: 'Italic (⌘I)',   action: (e) => e.chain().focus().toggleItalic().run(),               isActive: (e) => e.isActive('italic') },
  { key: 'strike',     label: 'S̶',   title: 'Strikethrough', action: (e) => e.chain().focus().toggleStrike().run(),               isActive: (e) => e.isActive('strike') },
  { key: 'code',       label: '`',   title: 'Inline code',   action: (e) => e.chain().focus().toggleCode().run(),                 isActive: (e) => e.isActive('code') },
  null,
  { key: 'h1',         label: 'H1',  title: 'Heading 1',     action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), isActive: (e) => e.isActive('heading', { level: 1 }) },
  { key: 'h2',         label: 'H2',  title: 'Heading 2',     action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), isActive: (e) => e.isActive('heading', { level: 2 }) },
  { key: 'h3',         label: 'H3',  title: 'Heading 3',     action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(), isActive: (e) => e.isActive('heading', { level: 3 }) },
  null,
  { key: 'bullet',     label: '•',   title: 'Bullet list',   action: (e) => e.chain().focus().toggleBulletList().run(),          isActive: (e) => e.isActive('bulletList') },
  { key: 'ordered',    label: '1.',  title: 'Ordered list',  action: (e) => e.chain().focus().toggleOrderedList().run(),         isActive: (e) => e.isActive('orderedList') },
  { key: 'blockquote', label: '❝',   title: 'Blockquote',    action: (e) => e.chain().focus().toggleBlockquote().run(),          isActive: (e) => e.isActive('blockquote') },
  null,
  { key: 'undo',       label: '↩',   title: 'Undo (⌘Z)',     action: (e) => e.chain().focus().undo().run(),                     isActive: () => false },
  { key: 'redo',       label: '↪',   title: 'Redo (⇧⌘Z)',    action: (e) => e.chain().focus().redo().run(),                     isActive: () => false },
]

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
    extensions: [StarterKit],
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
