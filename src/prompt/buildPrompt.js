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
        'You are an AI assistant embedded in a note-taking app. Write a short title on the first line (max 80 characters). Leave one blank line. Then write your full response as plain text. No JSON, no markdown, no labels — just the title, a blank line, then the content.',
    },
    {
      role: 'user',
      content: `Context cards:\n\n${contextBlock}\n\n---\n\nPrompt: ${prompt}`,
    },
  ]
}
