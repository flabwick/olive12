import { describe, expect, it } from 'vitest'
import { buildPrompt } from './buildPrompt'

describe('buildPrompt', () => {
  it('returns a two-element messages array', () => {
    const messages = buildPrompt('What is this about?', [])
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
  })

  it('system message instructs plain text output with title on first line', () => {
    const [system] = buildPrompt('test', [])
    expect(system.content).toContain('title')
    expect(system.content).toContain('first line')
    expect(system.content).not.toContain('JSON object')
  })

  it('user message contains the prompt', () => {
    const [, user] = buildPrompt('Summarise these notes', [])
    expect(user.content).toContain('Summarise these notes')
  })

  it('includes context card titles and bodies', () => {
    const cards = [{ id: '1', title: 'Meeting notes', body: 'Discuss roadmap' }]
    const [, user] = buildPrompt('prompt', cards)
    expect(user.content).toContain('Meeting notes')
    expect(user.content).toContain('Discuss roadmap')
  })

  it('shows placeholder when no context cards', () => {
    const [, user] = buildPrompt('prompt', [])
    expect(user.content).toContain('(no cards in the current tab)')
  })

  it('uses card index as heading when title is empty', () => {
    const cards = [{ id: '1', title: '', body: 'Some body' }]
    const [, user] = buildPrompt('prompt', cards)
    expect(user.content).toContain('Card 1')
  })

  it('separates multiple cards with dividers', () => {
    const cards = [
      { id: '1', title: 'A', body: 'a body' },
      { id: '2', title: 'B', body: 'b body' },
    ]
    const [, user] = buildPrompt('prompt', cards)
    expect(user.content).toContain('---')
  })
})
