import { RichTextEditor } from './RichTextEditor'

export default {
  title: 'Card/RichTextEditor',
  component: RichTextEditor,
  parameters: { layout: 'padded' },
  args: {
    editable: true,
    onChange: () => {},
  },
}

export const Empty = {
  args: { value: '', placeholder: 'Start writing…' },
}

export const PlainText = {
  args: { value: 'This is plain text content in the editor.' },
}

export const RichContent = {
  args: {
    value: `# Meeting notes

**Attendees:** Alice, Bob, Carol

## Action items

- Finalize the roadmap by _Friday_
- Review the ~~old proposal~~ new proposal
- Ship \`v2.0\` before end of quarter

> Always ship early, iterate fast.`,
  },
}

export const ReadOnly = {
  args: {
    value: '**Read-only** view of _markdown_ content.\n\n- item one\n- item two',
    editable: false,
  },
}

export const WithAriaLabel = {
  args: {
    value: 'Card body content',
    ariaLabel: 'Card body',
  },
}

export const WithEmbeddedCard = {
  args: {
    value: 'See also [[card-abc-123]] for context and [[card-xyz-456]] for details.',
    editable: false,
  },
}
