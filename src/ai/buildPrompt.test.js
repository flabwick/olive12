import { describe, expect, it } from 'vitest'
import { buildPrompt } from './buildPrompt'

describe('buildPrompt', () => {
  it('returns a two-element messages array', () => {
    const messages = buildPrompt('What is this about?', [])
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[1].role).toBe('user')
  })

  it('system message instructs structured tag format with no JSON', () => {
    const [system] = buildPrompt('test', [])
    expect(system.content).toContain('<card>')
    expect(system.content).toContain('<title>')
    expect(system.content).toContain('<body>')
    expect(system.content).not.toContain('JSON object')
  })

  it('TAB_NEW_CARD system message mentions fitting the tab theme', () => {
    const [system] = buildPrompt('test', [], 'TAB_NEW_CARD')
    expect(system.content).toContain('tab')
    expect(system.content).toContain('Olive')
  })

  it('DOCK_NEW_CARD system message mentions a reference card for the dock', () => {
    const [system] = buildPrompt('test', [], 'DOCK_NEW_CARD')
    expect(system.content).toContain('pinned')
    expect(system.content).toContain('concise')
  })

  it('DOCK_PROMPT system message mentions embedded card', () => {
    const [system] = buildPrompt('test', [], 'DOCK_PROMPT')
    expect(system.content).toContain('embed')
    expect(system.content).toContain('inline')
  })

  it('unknown entryPoint falls back to TAB_NEW_CARD system message', () => {
    const [systemDefault] = buildPrompt('test', [])
    const [systemUnknown] = buildPrompt('test', [], 'UNKNOWN_ENTRY')
    expect(systemUnknown.content).toBe(systemDefault.content)
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
