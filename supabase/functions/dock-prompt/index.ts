// Model config — change the model here and redeploy; no other location controls this.
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.1-8b-instruct',
  temperature: 0.7,
  maxTokens: 4096,
  maxContinuations: 6,
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Mirrors src/prompt/buildPrompt.js — keep both in sync if the prompt changes.
function buildMessages(
  prompt: string,
  contextCards: Array<{ id?: string; title?: string; body?: string }>,
): Array<{ role: string; content: string }> {
  const contextBlock =
    contextCards.length > 0
      ? contextCards
          .map((c, i) => {
            const heading = c.title ? `**${c.title}**` : `Card ${i + 1}`
            return `${heading}\n${c.body ?? ''}`.trim()
          })
          .join('\n\n---\n\n')
      : '(no cards in the current tab)'

  return [
    {
      role: 'system',
      content:
        'You are an AI assistant embedded in a note-taking app. Write a short title on the first line (max 80 characters). Leave one blank line. Then write your complete response as plain text — write the full answer, do not stop mid-sentence, and include all relevant detail. No JSON, no markdown, no labels — just the title, a blank line, then the content.',
    },
    {
      role: 'user',
      content: `Context cards:\n\n${contextBlock}\n\n---\n\nPrompt: ${prompt}`,
    },
  ]
}

// Mirrors src/prompt/parseDockPromptContent.js — keep both in sync if parsing changes.
const MAX_TITLE_LENGTH = 80

function parseContent(content: string): { title: string; body: string } {
  const trimmed = (content ?? '').trim()
  if (!trimmed) {
    return { title: 'Response', body: '' }
  }

  const lines = trimmed.split('\n')
  const firstLine = lines[0].trim()

  let bodyStart = 1
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') {
    bodyStart++
  }

  const body = lines.slice(bodyStart).join('\n').trim()

  if (!body) {
    if (firstLine.length <= MAX_TITLE_LENGTH) {
      return { title: firstLine || 'Response', body: '' }
    }
    return { title: 'Response', body: trimmed }
  }

  if (firstLine.length > MAX_TITLE_LENGTH) {
    return { title: 'Response', body: trimmed }
  }

  return {
    title: firstLine || 'Response',
    body,
  }
}

async function completeChat(
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
): Promise<{ content: string; finishReason: string; continuationCount: number }> {
  let fullContent = ''
  let finishReason = 'stop'
  let currentMessages = [...messages]
  let continuationCount = 0

  for (let attempt = 0; attempt <= MODEL_CONFIG.maxContinuations; attempt++) {
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
        messages: currentMessages,
      }),
    })

    console.log('[dock-prompt] OpenRouter status:', openRouterRes.status, 'attempt:', attempt)

    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text()
      console.log('[dock-prompt] OpenRouter error detail:', detail)
      throw new Error(`OpenRouter responded with ${openRouterRes.status}: ${detail}`)
    }

    const completion = await openRouterRes.json()
    const chunk: string = completion.choices?.[0]?.message?.content ?? ''
    finishReason = completion.choices?.[0]?.finish_reason ?? 'stop'
    fullContent += chunk

    console.log('[dock-prompt] finish_reason:', finishReason, 'chunkLen:', chunk.length)

    if (finishReason !== 'length') break

    continuationCount += 1
    currentMessages = [
      ...currentMessages,
      { role: 'assistant', content: chunk },
      {
        role: 'user',
        content:
          'Continue exactly where you left off. Do not repeat any text already written. Keep the same plain-text format.',
      },
    ]
  }

  return { content: fullContent, finishReason, continuationCount }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    console.log('[dock-prompt] received body:', JSON.stringify(body))
    const { prompt, contextCards } = body

    if (!prompt || typeof prompt !== 'string') {
      console.log('[dock-prompt] missing or invalid prompt')
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('OPENROUTER_API_KEY')
    console.log('[dock-prompt] apiKey present:', !!apiKey)
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'OPENROUTER_API_KEY not configured' }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    const messages = buildMessages(prompt, contextCards ?? [])
    console.log('[dock-prompt] sending to OpenRouter, model:', MODEL_CONFIG.model)

    const { content, finishReason, continuationCount } = await completeChat(apiKey, messages)
    console.log('[dock-prompt] total content length:', content.length)
    console.log('[dock-prompt] raw content:', JSON.stringify(content))

    const { title, body: cardBody } = parseContent(content)
    console.log('[dock-prompt] parsed title:', JSON.stringify(title))
    console.log('[dock-prompt] parsed body length:', cardBody.length)

    const truncated = finishReason === 'length'

    const responsePayload = {
      title,
      body: cardBody,
      truncated,
      _debug: { finishReason, continuationCount, rawContent: content },
    }

    return new Response(
      JSON.stringify(responsePayload),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[dock-prompt] unhandled error:', String(err))
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  }
})
