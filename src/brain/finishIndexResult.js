function summarizeFromBody(body) {
  const text = body.trim().replace(/\s+/g, ' ')
  if (!text) return ''

  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (sentences?.length) {
    const joined = sentences.slice(0, 2).join(' ').trim()
    return joined.length <= 280 ? joined : joined.slice(0, 277) + '…'
  }

  return text.length <= 280 ? text : text.slice(0, 277) + '…'
}

function inferTags(title, body) {
  const words = `${title} ${body}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3)
  const unique = [...new Set(words)]
  return unique.slice(0, 5)
}

export function finishIndexResult(parsed, card) {
  const title = (parsed.title || card.title || '').trim().slice(0, 80)
  let summary = (parsed.summary || parsed.description || parsed.abstract || '').trim()
  const tags = Array.isArray(parsed.tags) && parsed.tags.length > 0
    ? parsed.tags.filter((t) => typeof t === 'string')
    : inferTags(title, card.body ?? '')
  const links = Array.isArray(parsed.links)
    ? parsed.links.filter((l) => typeof l === 'string')
    : []

  let summarySource = 'llm'
  if (!summary && card.body?.trim()) {
    summary = summarizeFromBody(card.body)
    summarySource = 'body-fallback'
  }

  return {
    title,
    tags,
    summary,
    links,
    summarySource,
  }
}

export function enrichIndexEntry(entry, card) {
  if (!entry || !card) return entry
  if (card.location !== 'library') return entry
  if (entry.summary?.trim()) return entry

  const finished = finishIndexResult(entry, card)
  if (!finished.summary.trim()) return entry

  return {
    ...entry,
    title: finished.title || entry.title,
    tags: finished.tags.length > 0 ? finished.tags : entry.tags,
    summary: finished.summary,
  }
}

export function extractIndexPayload(raw) {
  if (raw == null) return null
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw

  const text = String(raw).trim()
  const cleaned = text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()

  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}
