import { useEffect, useMemo, useState } from 'react'
import { deskMessagesFor, loadDeskMessages, type DeskMessage } from '../../lib/deskMessages'

type Props = {
  audience: 'athlete' | 'parent'
  surface: 'home' | 'learn'
  className?: string
}

export function DeskMessageCarousel({ audience, surface, className = '' }: Props) {
  const [list, setList] = useState<DeskMessage[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    let cancelled = false
    void loadDeskMessages().then((rows) => {
      if (!cancelled) setList(rows)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const messages = useMemo(() => deskMessagesFor(list, audience, surface), [list, audience, surface])

  useEffect(() => {
    setIndex(0)
  }, [messages.map((m) => m.id).join('|')])

  useEffect(() => {
    if (messages.length <= 1) return
    const id = window.setInterval(() => {
      setIndex((cur) => (cur + 1) % messages.length)
    }, 9000)
    return () => window.clearInterval(id)
  }, [messages.length])

  if (messages.length === 0) return null

  const active = messages[index % messages.length]!

  return (
    <section
      className={`rounded-xl border border-[var(--panel-border)] bg-gradient-to-br from-[#0f161d] to-[#121820] p-4 ${className}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        From your gym
      </p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{active.text}</p>
      {messages.length > 1 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {messages.map((row, i) => (
            <button
              key={row.id}
              type="button"
              aria-label={`Message ${i + 1} of ${messages.length}`}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => setIndex(i)}
              className={`h-2 w-2 rounded-full ${i === index ? 'bg-[var(--accent)]' : 'bg-white/25'}`}
            />
          ))}
          <span className="text-[10px] text-[var(--muted)]">
            {index + 1} / {messages.length}
          </span>
        </div>
      )}
    </section>
  )
}
