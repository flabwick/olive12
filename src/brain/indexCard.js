import { supabase } from '../lib/supabaseClient'
import { computeContentHash } from '../sync/cardSyncLogic'
import { INDEX_STAGES, logIndexEvent } from '../debug/indexPipelineDebug'
import { createIndexEntry } from './createIndexEntry'
import { extractIndexPayload, finishIndexResult } from './finishIndexResult'
import { getAllIndexEntries, putIndexEntry } from './indexEntryStorage'

function normalizeInvokeData(data) {
  if (data == null) return null
  if (typeof data === 'object' && !Array.isArray(data)) return data
  return extractIndexPayload(data)
}

export async function indexCard(card, { userId } = {}) {
  const cardId = card.id

  if (card.location !== 'library') {
    const err = new Error(`indexCard requires location "library" (got "${card.location ?? 'none'}")`)
    logIndexEvent({ stage: INDEX_STAGES.INVOKE_START, cardId, status: 'skip', detail: { location: card.location }, error: err })
    throw err
  }

  logIndexEvent({
    stage: INDEX_STAGES.INVOKE_START,
    cardId,
    status: 'start',
    detail: { title: card.title, location: card.location, bodyLen: card.body?.length ?? 0 },
  })

  const neighborEntries = (await getAllIndexEntries())
    .filter((e) => e.cardId !== cardId)
    .slice(0, 10)

  logIndexEvent({
    stage: INDEX_STAGES.INVOKE_START,
    cardId,
    status: 'ok',
    detail: { neighborCount: neighborEntries.length },
  })

  const { data: rawData, error } = await supabase.functions.invoke('wiki-index', {
    body: { card, neighborEntries },
  })

  logIndexEvent({
    stage: INDEX_STAGES.INVOKE_RESPONSE,
    cardId,
    status: error ? 'error' : 'ok',
    detail: { rawType: typeof rawData, hasErrorField: !!rawData?.error },
    error,
  })

  if (error) throw error

  const data = normalizeInvokeData(rawData)
  if (!data) {
    const err = new Error('wiki-index returned no data')
    logIndexEvent({ stage: INDEX_STAGES.PARSE, cardId, status: 'error', error: err })
    throw err
  }

  if (data.error) {
    const err = new Error(
      typeof data.detail === 'string' ? `${data.error}: ${data.detail}` : data.error,
    )
    logIndexEvent({ stage: INDEX_STAGES.PARSE, cardId, status: 'error', detail: data, error: err })
    throw err
  }

  const finished = finishIndexResult(data, card)

  const entry = createIndexEntry({
    cardId,
    title: finished.title,
    tags: finished.tags,
    summary: finished.summary,
    links: finished.links,
    contentHash: computeContentHash(card),
  })

  logIndexEvent({
    stage: INDEX_STAGES.PARSE,
    cardId,
    status: 'ok',
    detail: {
      title: entry.title,
      tagCount: entry.tags.length,
      summaryLen: entry.summary.length,
      summaryPreview: entry.summary.slice(0, 120),
      summarySource: finished.summarySource,
      linkCount: entry.links.length,
      llmSummaryLen: (data.summary ?? '').length,
    },
  })

  await putIndexEntry(entry)

  logIndexEvent({
    stage: INDEX_STAGES.DEXIE_WRITE,
    cardId,
    status: 'ok',
    detail: { summary: entry.summary.slice(0, 80) },
  })

  if (userId) {
    try {
      const { error: upsertError } = await supabase.from('index_entries').upsert({
        card_id: cardId,
        user_id: userId,
        title: entry.title,
        tags: entry.tags,
        summary: entry.summary,
        links: entry.links,
        content_hash: entry.contentHash,
        updated_at: new Date(entry.updatedAt).toISOString(),
      })
      if (upsertError) throw upsertError
      logIndexEvent({ stage: INDEX_STAGES.SUPABASE_UPSERT, cardId, status: 'ok' })
    } catch (upsertErr) {
      logIndexEvent({
        stage: INDEX_STAGES.SUPABASE_UPSERT,
        cardId,
        status: 'error',
        error: upsertErr,
        detail: { note: 'Dexie entry saved; Supabase sync failed' },
      })
    }
  }

  return entry
}
