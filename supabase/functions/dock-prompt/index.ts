// Model config — change the model here and redeploy; no other location controls this.
const MODEL_CONFIG = {
  model: 'meta-llama/llama-3.2-3b-instruct',
  temperature: 0.7,
  maxTokens: 2000,
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
        'You are an AI assistant embedded in a note-taking app. The user will give you a prompt and the current tab\'s visible cards as context. Respond with a single JSON object and nothing else — no markdown fences, no explanation. The object must have exactly two string fields: "title" (max 80 characters) and "body" (plain text content). Do not wrap the JSON in backticks or any other formatting.',
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
    const { prompt, contextCards } = await req.json()

    if (!prompt || typeof prompt !== 'string') {
      return new Response(JSON.stringify({ error: 'prompt is required' }), {
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

    const messages = buildMessages(prompt, contextCards ?? [])

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

    if (!openRouterRes.ok) {
      const detail = await openRouterRes.text()
      return new Response(
        JSON.stringify({ error: `OpenRouter responded with ${openRouterRes.status}`, detail }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        },
      )
    }

    const completion = await openRouterRes.json()
    const content: string = completion.choices?.[0]?.message?.content ?? ''

    let parsed: { title?: string; body?: string } = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      // Model didn't return valid JSON — use raw content as the body.
      parsed = { title: 'Response', body: content }
    }

    return new Response(
      JSON.stringify({
        title: parsed.title ?? 'Response',
        body: parsed.body ?? content,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      },
    )
  }
})
