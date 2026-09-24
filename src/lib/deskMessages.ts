import { markedFetch } from './authSession'

export type DeskMessageAudience = 'athlete' | 'parent' | 'all'
export type DeskMessageSurface = 'home' | 'learn' | 'all'

export type DeskMessage = {
  id: string
  text: string
  audience: DeskMessageAudience
  surface: DeskMessageSurface
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export async function loadDeskMessages(): Promise<DeskMessage[]> {
  const res = await fetch('/api/desk-messages', { credentials: 'same-origin', cache: 'no-store' })
  if (!res.ok) return []
  const data = (await res.json()) as { messages?: DeskMessage[] }
  return Array.isArray(data.messages) ? data.messages : []
}

export async function saveDeskMessages(messages: DeskMessage[]): Promise<DeskMessage[]> {
  const res = await markedFetch('/api/desk-messages', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  if (!res.ok) throw new Error('Could not save desk messages.')
  const data = (await res.json()) as { messages?: DeskMessage[] }
  return Array.isArray(data.messages) ? data.messages : messages
}

export function deskMessagesFor(
  list: DeskMessage[],
  audience: 'athlete' | 'parent',
  surface: 'home' | 'learn',
): DeskMessage[] {
  return list.filter((row) => {
    if (!row.enabled) return false
    if (row.audience !== 'all' && row.audience !== audience) return false
    if (row.surface !== 'all' && row.surface !== surface) return false
    return true
  })
}
