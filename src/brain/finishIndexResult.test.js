import { describe, expect, it } from 'vitest'
import { extractIndexPayload, finishIndexResult, enrichIndexEntry } from './finishIndexResult'

describe('finishIndexResult', () => {
  const card = {
    id: 'c1',
    title: 'Charles Darwin',
    body: 'Charles Robert Darwin was a British naturalist. He proposed natural selection.',
  }

  it('uses LLM summary when present', () => {
    const result = finishIndexResult(
      { title: 'Darwin', tags: ['biology'], summary: 'A naturalist.', links: [] },
      card,
    )
    expect(result.summary).toBe('A naturalist.')
    expect(result.summarySource).toBe('llm')
  })

  it('falls back to card body when summary is empty', () => {
    const result = finishIndexResult(
      { title: 'Darwin', tags: [], summary: '', links: [] },
      card,
    )
    expect(result.summary).toContain('Charles Robert Darwin')
    expect(result.summarySource).toBe('body-fallback')
  })

  it('falls back to card title when LLM title is empty', () => {
    const result = finishIndexResult({ title: '', tags: [], summary: 'Bio.', links: [] }, card)
    expect(result.title).toBe('Charles Darwin')
  })

  it('infers tags when LLM returns none', () => {
    const result = finishIndexResult({ title: 'T', tags: [], summary: 'S', links: [] }, card)
    expect(result.tags.length).toBeGreaterThan(0)
  })
})

describe('extractIndexPayload', () => {
  it('parses JSON wrapped in code fences', () => {
    expect(extractIndexPayload('```json\n{"title":"A","summary":"B"}\n```')).toEqual({
      title: 'A',
      summary: 'B',
    })
  })

  it('extracts JSON object from surrounding text', () => {
    expect(extractIndexPayload('Here is the index: {"title":"A","summary":"B"} done')).toEqual({
      title: 'A',
      summary: 'B',
    })
  })
})

describe('enrichIndexEntry', () => {
  const card = {
    id: 'c1',
    title: 'Charles Darwin',
    body: 'Charles Robert Darwin was a British naturalist. He proposed natural selection.',
  }

  it('fills empty summary from card body', () => {
    const entry = { cardId: 'c1', title: 'Darwin', tags: [], summary: '', links: [], contentHash: '', updatedAt: 1 }
    const enriched = enrichIndexEntry(entry, { ...card, location: 'library' })
    expect(enriched.summary).toContain('Charles Robert Darwin')
  })

  it('does not enrich shelf cards', () => {
    const entry = { cardId: 'c1', title: 'Darwin', tags: [], summary: '', links: [], contentHash: '', updatedAt: 1 }
    const enriched = enrichIndexEntry(entry, { ...card, location: 'shelf' })
    expect(enriched.summary).toBe('')
  })
})
