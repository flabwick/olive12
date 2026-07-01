// Produces the flat list of visible card data to send as LLM context.
// Hidden cards (hiddenState: true) are excluded — that's the user's explicit "eye off" toggle.
// Folded cards are included — folding is a display affordance, not a content exclusion.
export function assembleContext(entries) {
  return entries
    .filter((entry) => !entry.hiddenState)
    .map((entry) => ({
      id: entry.card.id,
      title: entry.card.title,
      body: entry.card.body,
    }))
}
