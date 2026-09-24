import { useEffect, useState } from 'react'
import { createId } from '../lib/storage'
import {
  loadDeskMessages,
  saveDeskMessages,
  type DeskMessage,
  type DeskMessageAudience,
  type DeskMessageSurface,
} from '../lib/deskMessages'
import { CollapsibleSection } from './CollapsibleSection'

type Props = {
  admin: boolean
}

export function DeskMessagesEditor({ admin }: Props) {
  const [messages, setMessages] = useState<DeskMessage[]>([])
  const [draft, setDraft] = useState('')
  const [audience, setAudience] = useState<DeskMessageAudience>('all')
  const [surface, setSurface] = useState<DeskMessageSurface>('all')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (!admin) return
    void loadDeskMessages()
      .then(setMessages)
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load messages.'))
  }, [admin])

  if (!admin) return null

  const persist = async (next: DeskMessage[]) => {
    setMessages(next)
    try {
      const savedRows = await saveDeskMessages(next)
      setMessages(savedRows)
      setSaved('Saved.')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save messages.')
    }
  }

  const addMessage = () => {
    const text = draft.trim()
    if (!text) return
    const now = new Date().toISOString()
    const row: DeskMessage = {
      id: createId('msg'),
      text,
      audience,
      surface,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    }
    void persist([row, ...messages])
    setDraft('')
  }

  return (
    <CollapsibleSection
      title="Home & Learn messages"
      hint="Short notes that cycle on athlete and parent Home / Learn"
      defaultOpen={false}
    >
      <p className="text-sm leading-relaxed text-[var(--muted)]">
        Add as many lines as you want. Athletes and parents see them on Home and Learn — one at a
        time, rotating every few seconds.
      </p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {saved && <p className="mt-2 text-sm text-[var(--accent)]">{saved}</p>}
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="e.g. Hollow holds count toward your March goal."
        className="mt-3 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
      />
      <div className="mt-2 flex flex-wrap gap-3 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">Show for</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as DeskMessageAudience)}
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1"
          >
            <option value="all">Athletes & parents</option>
            <option value="athlete">Athletes only</option>
            <option value="parent">Parents only</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[var(--muted)]">On</span>
          <select
            value={surface}
            onChange={(e) => setSurface(e.target.value as DeskMessageSurface)}
            className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1"
          >
            <option value="all">Home & Learn</option>
            <option value="home">Home only</option>
            <option value="learn">Learn only</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={addMessage}
        className="mt-3 rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-[var(--on-accent)]"
      >
        Add message
      </button>
      <ul className="mt-4 space-y-2">
        {messages.map((row) => (
          <li
            key={row.id}
            className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
          >
            <p>{row.text}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {row.audience === 'all' ? 'Everyone' : row.audience} ·{' '}
              {row.surface === 'all' ? 'Home & Learn' : row.surface}
              {!row.enabled ? ' · off' : ''}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="text-xs font-semibold text-[var(--accent)]"
                onClick={() =>
                  void persist(
                    messages.map((m) =>
                      m.id === row.id ? { ...m, enabled: !m.enabled, updatedAt: new Date().toISOString() } : m,
                    ),
                  )
                }
              >
                {row.enabled ? 'Pause' : 'Turn on'}
              </button>
              <button
                type="button"
                className="text-xs font-semibold text-red-400"
                onClick={() => void persist(messages.filter((m) => m.id !== row.id))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
        {messages.length === 0 && (
          <li className="text-sm text-[var(--muted)]">No messages yet — add one above.</li>
        )}
      </ul>
    </CollapsibleSection>
  )
}
