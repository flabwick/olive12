// Parses the plain-text response from the dock-prompt model.
// Mirrored in supabase/functions/dock-prompt/index.ts — keep both in sync.
//
// Title is ALWAYS line 1 only (per the system prompt). Body is everything after
// line 1, skipping blank lines. We must NOT split on the first \n\n in the
// content — models often paragraph-break inside the body, which previously
// swallowed most of the text into the title field.

const MAX_TITLE_LENGTH = 80

export function parseDockPromptContent(content) {
  const trimmed = (content ?? '').trim()
  if (!trimmed) {
    return { title: 'Response', body: '' }
  }

  const lines = trimmed.split('\n')
  const firstLine = lines[0].trim()

  // Skip blank lines between title and body
  let bodyStart = 1
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') {
    bodyStart++
  }

  const body = lines.slice(bodyStart).join('\n').trim()

  // Single line or title-only response
  if (!body) {
    if (firstLine.length <= MAX_TITLE_LENGTH) {
      return { title: firstLine || 'Response', body: '' }
    }
    return { title: 'Response', body: trimmed }
  }

  // Model skipped the title format and started with a long paragraph
  if (firstLine.length > MAX_TITLE_LENGTH) {
    return { title: 'Response', body: trimmed }
  }

  return {
    title: firstLine || 'Response',
    body,
  }
}
