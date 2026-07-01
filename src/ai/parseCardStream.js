// Incrementally parses the structured card format from accumulated streamed text.
// Safe to call repeatedly on a growing string as SSE deltas arrive.
//
// Expected format:
//   <card>
//   <type>text</type>
//   <title>Card title here</title>
//   <body>
//   Body content here.
//   </body>
//   </card>
//
// Returns { type, title, body, done }:
//   type  — string once <type>...</type> is fully received, otherwise null
//   title — string once <title>...</title> is fully received, otherwise null
//           empty tag → 'Response'
//   body  — string once <body> opens (streams incrementally), null until then
//           trailing partial closing tag is stripped from streaming body
//   done  — true when </body> or </card> is seen

export function parseCardStream(accumulated) {
  const typeMatch = /<type>([^<]*)<\/type>/.exec(accumulated)
  const type = typeMatch ? typeMatch[1].trim() : null

  const titleMatch = /<title>([^<]*)<\/title>/.exec(accumulated)
  const title = titleMatch ? (titleMatch[1].trim() || 'Response') : null

  const bodyOpen = accumulated.indexOf('<body>')
  let body = null
  let done = false

  if (bodyOpen !== -1) {
    const afterOpen = accumulated.slice(bodyOpen + 6)
    const bodyClose = afterOpen.indexOf('</body>')

    if (bodyClose !== -1) {
      body = afterOpen.slice(0, bodyClose).trim()
      done = true
    } else {
      // Still streaming: strip any trailing partial closing tag (e.g. "</bo", "<")
      let partial = afterOpen
      const lastLt = partial.lastIndexOf('<')
      if (lastLt !== -1 && partial.indexOf('>', lastLt) === -1) {
        partial = partial.slice(0, lastLt)
      }
      body = partial.trim() || null
    }
  }

  if (accumulated.includes('</card>')) done = true

  return { type, title, body, done }
}
