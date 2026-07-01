// Parses a single SSE line from the OpenRouter streaming API.
// Returns the delta content string, or null for non-content lines.
export function parseStreamChunk(line) {
  if (!line.startsWith('data: ')) return null
  const payload = line.slice(6).trim()
  if (payload === '[DONE]') return null
  try {
    const parsed = JSON.parse(payload)
    const content = parsed?.choices?.[0]?.delta?.content
    return typeof content === 'string' ? content : null
  } catch {
    return null
  }
}
