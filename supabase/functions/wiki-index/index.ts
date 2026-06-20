// Model config — change the model here and redeploy; no other location controls this.
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.3,
  maxTokens: 500,
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface IndexEntry {
  cardId: string
  title: string
  tags: string[]
  summary: string
  links: string[]
}

interface Card {
  id: string
  title?: string
  body?: string
  config?: unknown
}

function buildMessages(
  card: Card,
  neighborEntries: IndexEntry[],
): Array<{ role: string; content: string }> {
  const neighborBlock =
    neighborEntries.length > 0
      ? neighborEntries
          .map((e) => `- "${e.title}" (tags: ${e.tags.join(', ') || 'none'})`)
          .join('\n')
      : '(no existing index entries)'

  const cardText = [
    card.title ? `Title: ${card.title}` : '',
    card.body ? `Body:\n${card.body}` : '',
  ]
    .filter(Boolean)
    .join('\n')

  return [
    {
      role: 'system',
      content:
        'You are a knowledge indexer for a personal note-taking app. ' +
        'Given a card, produce a concise index entry as valid JSON with these exact keys: ' +
        '"title" (string, ≤80 chars), ' +
        '"tags" (array of 1–5 lowercase keyword strings), ' +
        '"summary" (string, 1–2 sentences), ' +
        '"links" (array of card id strings that this card references — only ids that appear in the card body verbatim). ' +
        'Output only the JSON object, no markdown, no code fences, no explanation.',
    },
    {
      role: 'user',
      content:
        `Card to index:\n${cardText}\n\n` +
        `Existing index entries (for context on the knowledge base):\n${neighborBlock}`,
    },
  ]
}

function parseIndexResult(
  content: string,
  card: Card,
): { title: string; tags: string[]; summary: string; links: string[] } {
  const cleaned = content.trim().replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '').trim()
  let parsed: Record<string, unknown> | null = null

  try {
    parsed = JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        parsed = JSON.parse(match[0])
      } catch {
        parsed = null
      }
    }
  }

  if (parsed && typeof parsed === 'object') {
    const title = typeof parsed.title === 'string' ? parsed.title.slice(0, 80) : ''
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown) => typeof t === 'string')
      : []
    let summary =
      typeof parsed.summary === 'string'
        ? parsed.summary
        : typeof parsed.description === 'string'
          ? parsed.description
          : ''
    const links = Array.isArray(parsed.links)
      ? parsed.links.filter((l: unknown) => typeof l === 'string')
      : []

    if (!summary.trim() && card.body?.trim()) {
      summary = summarizeFromBody(card.body)
    }

    return {
      title: title || card.title || '',
      tags,
      summary,
      links,
    }
  }

  return {
    title: card.title || '',
    tags: [],
    summary: card.body?.trim() ? summarizeFromBody(card.body) : content.slice(0, 200),
    links: [],
  }
}

function summarizeFromBody(body: string): string {
  const text = body.trim().replace(/\s+/g, ' ')
  if (!text) return ''

  const sentences = text.match(/[^.!?]+[.!?]+/g)
  if (sentences?.length) {
    const joined = sentences.slice(0, 2).join(' ').trim()
    return joined.length <= 280 ? joined : joined.slice(0, 277) + '…'
  }

  return text.length <= 280 ? text : text.slice(0, 277) + '…'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    console.log('[wiki-index] received body keys:', Object.keys(body))
    const { card, neighborEntries } = body

    if (!card || typeof card !== 'object') {
      return new Response(JSON.stringify({ error: 'card is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const messages = buildMessages(card as Card, (neighborEntries ?? []) as IndexEntry[])
    console.log('[wiki-index] sending to OpenRouter, model:', MODEL_CONFIG.model)

    const openRouterRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        temperature: MODEL_CONFIG.temperature,
        max_tokens: MODEL_CONFIG.maxTokens,
        messages,
      }),
    })

    console.log('[wiki-index] OpenRouter status:', openRouterRes.status)

    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text()
      console.log('[wiki-index] OpenRouter error detail:', detail)
      return new Response(
        JSON.stringify({ error: `OpenRouter responded with ${openRouterRes.status}`, detail }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    const completion = await openRouterRes.json()
    const rawContent: string = completion.choices?.[0]?.message?.content ?? ''
    console.log('[wiki-index] raw content:', JSON.stringify(rawContent))

    const result = parseIndexResult(rawContent, card as Card)
    console.log('[wiki-index] parsed result:', JSON.stringify(result))

    return new Response(
      JSON.stringify(result),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[wiki-index] unhandled error:', String(err))
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  }
})
