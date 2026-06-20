const MAX_EVENTS = 200
const listeners = new Set()
let events = []

export const INDEX_STAGES = {
  MOVE_TO_LIBRARY: 'moveToLibrary',
  INVOKE_START: 'wiki-index:invoke',
  INVOKE_RESPONSE: 'wiki-index:response',
  PARSE: 'wiki-index:parse',
  DEXIE_WRITE: 'dexie:put',
  SUPABASE_UPSERT: 'supabase:upsert',
  STATE_UPDATE: 'react:state',
  DEXIE_RELOAD: 'dexie:reload',
  FLIP: 'flip',
  ENSURE_INDEX: 'ensureIndex',
  RENDER: 'cardBack:render',
  LOOKUP: 'getIndexEntry',
}

function serializeDetail(detail) {
  if (detail == null) return undefined
  try {
    return JSON.parse(JSON.stringify(detail))
  } catch {
    return String(detail)
  }
}

export function logIndexEvent({ stage, cardId, status = 'info', detail, error }) {
  const event = {
    id: crypto.randomUUID(),
    ts: Date.now(),
    stage,
    cardId: cardId ?? null,
    status,
    detail: serializeDetail(detail),
    error: error?.message ?? (typeof error === 'string' ? error : error ? String(error) : null),
  }
  events = [event, ...events].slice(0, MAX_EVENTS)
  const label = `[index-pipeline] ${stage} ${status}`
  if (status === 'error') {
    console.error(label, event)
  } else {
    console.log(label, event)
  }
  listeners.forEach((fn) => fn(events))
  return event
}

export function subscribeIndexDebug(listener) {
  listeners.add(listener)
  listener(events)
  return () => listeners.delete(listener)
}

export function getIndexDebugEvents() {
  return events
}

export function clearIndexDebugEvents() {
  events = []
  listeners.forEach((fn) => fn(events))
}

export function getEventsForCard(cardId) {
  return events.filter((e) => e.cardId === cardId)
}

export function getLastEventForCard(cardId) {
  return events.find((e) => e.cardId === cardId) ?? null
}

export function getLastErrorForCard(cardId) {
  return events.find((e) => e.cardId === cardId && e.status === 'error') ?? null
}
