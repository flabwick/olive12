// Model config — change the model here and redeploy; no other location controls this.
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.3-70b-instruct',
  temperature: 0.7,
  maxTokens: 4000,
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
    console.log('[dock-prompt] sending streaming request to OpenRouter, model:', MODEL_CONFIG.model)

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
        stream: true,
        messages,
      }),
    })

    console.log('[dock-prompt] OpenRouter status:', openRouterRes.status)

    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text()
      console.log('[dock-prompt] OpenRouter error detail:', detail)
      return new Response(JSON.stringify({ error: `OpenRouter error ${openRouterRes.status}: ${detail}` }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      })
    }

    // Pipe the SSE stream directly from OpenRouter to the client.
    return new Response(openRouterRes.body, {
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
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
