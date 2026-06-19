// Builds the messages array for the OpenRouter chat completions API.
// This pure function is mirrored in supabase/functions/dock-prompt/index.ts
// for use in the Deno edge function. Keep both in sync if the prompt changes.
export function buildPrompt(prompt, contextCards) {
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
