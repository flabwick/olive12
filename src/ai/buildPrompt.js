// Builds the messages array for the OpenRouter chat completions API.
// This pure function is mirrored in supabase/functions/dock-prompt/index.ts
// for use in the Deno edge function. Keep both in sync if the prompt changes.

const FORMAT_RULE =
  'Respond using exactly this format and no other text:\n\n<card>\n<type>text</type>\n<title>Your title here (max 80 characters)</title>\n<body>\nYour full response here as plain text.\n</body>\n</card>'

const SYSTEM_MESSAGES = {
  TAB_NEW_CARD:
    `You are Olive, an AI assistant embedded in a note-taking app. The user wants a new card for their current tab. Study the context cards to understand what this tab is about, then create content that fits and extends it — something genuinely useful given what's already there. ${FORMAT_RULE}`,
  DOCK_NEW_CARD:
    `You are Olive, an AI assistant embedded in a note-taking app. The user wants a compact reference card to keep pinned at the bottom of their screen while they work. Look at the context cards to understand what they're working on, then create a focused, reusable reference — something worth keeping at hand. Keep it concise. ${FORMAT_RULE}`,
  DOCK_PROMPT:
    `You are Olive, an AI assistant embedded in a note-taking app. The user is editing a card and wants to embed a new card inline within it. Create content that works as a self-contained embedded reference — something that enriches the surrounding card when read in context. ${FORMAT_RULE}`,
}

export function buildPrompt(prompt, contextCards, entryPoint = 'TAB_NEW_CARD') {
  const contextBlock =
    contextCards.length > 0
      ? contextCards
          .map((c, i) => {
            const heading = c.title ? `**${c.title}**` : `Card ${i + 1}`
            return `${heading}\n${c.body ?? ''}`.trim()
          })
          .join('\n\n---\n\n')
      : '(no cards in the current tab)'

  const systemContent = SYSTEM_MESSAGES[entryPoint] ?? SYSTEM_MESSAGES.TAB_NEW_CARD

  return [
    {
      role: 'system',
      content: systemContent,
    },
    {
      role: 'user',
      content: `Context cards:\n\n${contextBlock}\n\n---\n\nPrompt: ${prompt}`,
    },
  ]
}
