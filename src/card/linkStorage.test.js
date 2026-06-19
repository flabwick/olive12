import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../db/vaultDb'
import {
  deleteLinksForSource,
  getLinksForSource,
  getLinksForTarget,
  putLinks,
  rebuildLinksForCard,
} from './linkStorage'

beforeEach(async () => {
  await db.links.clear()
  vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000)
})

const makeLink = (sourceCardId, targetCardId, linkType = 'portal') => ({
  sourceCardId,
  targetCardId,
  linkType,
  createdAt: 1_700_000_000_000,
})

describe('putLinks / getLinksForSource', () => {
  it('returns empty array when no links exist', async () => {
    const links = await getLinksForSource('c1')
    expect(links).toEqual([])
  })

  it('round-trips a single link', async () => {
    await putLinks([makeLink('c1', 'c2')])
    const links = await getLinksForSource('c1')
    expect(links).toHaveLength(1)
    expect(links[0]).toEqual(makeLink('c1', 'c2'))
  })

  it('stores multiple links for the same source', async () => {
    await putLinks([makeLink('c1', 'c2'), makeLink('c1', 'c3')])
    const links = await getLinksForSource('c1')
    expect(links).toHaveLength(2)
  })

  it('only returns links for the queried source', async () => {
    await putLinks([makeLink('c1', 'c2'), makeLink('c9', 'c2')])
    const links = await getLinksForSource('c1')
    expect(links).toHaveLength(1)
    expect(links[0].sourceCardId).toBe('c1')
  })

  it('upserts on duplicate compound key', async () => {
    await putLinks([makeLink('c1', 'c2', 'portal')])
    await putLinks([makeLink('c1', 'c2', 'embed')])
    const links = await getLinksForSource('c1')
    expect(links).toHaveLength(1)
    expect(links[0].linkType).toBe('embed')
  })
})

describe('getLinksForTarget', () => {
  it('returns empty array when no links exist', async () => {
    expect(await getLinksForTarget('c2')).toEqual([])
  })

  it('returns only links pointing at the target', async () => {
    await putLinks([makeLink('c1', 'c2'), makeLink('c3', 'c2'), makeLink('c1', 'c9')])
    const links = await getLinksForTarget('c2')
    expect(links).toHaveLength(2)
    expect(links.every((l) => l.targetCardId === 'c2')).toBe(true)
  })
})

describe('deleteLinksForSource', () => {
  it('removes all links for the given source', async () => {
    await putLinks([makeLink('c1', 'c2'), makeLink('c1', 'c3')])
    await deleteLinksForSource('c1')
    expect(await getLinksForSource('c1')).toEqual([])
  })

  it('does not remove links for other sources', async () => {
    await putLinks([makeLink('c1', 'c2'), makeLink('c9', 'c2')])
    await deleteLinksForSource('c1')
    expect(await getLinksForSource('c9')).toHaveLength(1)
  })

  it('is a no-op when no links exist for the source', async () => {
    await expect(deleteLinksForSource('c1')).resolves.not.toThrow()
  })
})

describe('rebuildLinksForCard', () => {
  it('writes a link for a portal card', async () => {
    const card = { id: 'portal-1', type: 'portal', config: { target_card_id: 'target-1' } }
    await rebuildLinksForCard(card)
    const links = await getLinksForSource('portal-1')
    expect(links).toHaveLength(1)
    expect(links[0].targetCardId).toBe('target-1')
    expect(links[0].linkType).toBe('portal')
  })

  it('writes no links for a text card with no embed syntax', async () => {
    const card = { id: 'text-1', type: 'text', body: 'plain text', config: null }
    await rebuildLinksForCard(card)
    expect(await getLinksForSource('text-1')).toEqual([])
  })

  it('replaces existing links with new ones on rebuild', async () => {
    const old = { id: 'portal-1', type: 'portal', config: { target_card_id: 'old-target' } }
    await rebuildLinksForCard(old)
    expect(await getLinksForSource('portal-1')).toHaveLength(1)

    const updated = { id: 'portal-1', type: 'portal', config: { target_card_id: 'new-target' } }
    await rebuildLinksForCard(updated)

    const links = await getLinksForSource('portal-1')
    expect(links).toHaveLength(1)
    expect(links[0].targetCardId).toBe('new-target')
  })

  it('removes all links when portal card loses its target', async () => {
    const card = { id: 'portal-1', type: 'portal', config: { target_card_id: 'target-1' } }
    await rebuildLinksForCard(card)
    const cleared = { id: 'portal-1', type: 'portal', config: null }
    await rebuildLinksForCard(cleared)
    expect(await getLinksForSource('portal-1')).toEqual([])
  })

  it('writes embed links from [[id]] syntax in text card body', async () => {
    const card = { id: 'text-1', type: 'text', body: 'see [[c2]] and [[c3]]', config: null }
    await rebuildLinksForCard(card)
    const links = await getLinksForSource('text-1')
    expect(links).toHaveLength(2)
    expect(links.map((l) => l.targetCardId).sort()).toEqual(['c2', 'c3'])
  })
})
