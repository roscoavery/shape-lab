import { useEffect, useState } from 'react'
import { HOLD_BUILD_CHIP, HOLD_BUILD_LABEL } from '../lib/holdBuild'
import { sessionIsAdmin, type AuthSessionUser } from '../lib/authSession'
import {
  endSignedInLogin,
  listSignedInLogins,
  listWatchEvents,
  watchActionLabel,
  watchWhen,
  type WatchEvent,
  type WatchSession,
} from '../lib/watchDesk'

type Props = {
  user: AuthSessionUser
}

export function WatchDesk({ user }: Props) {
  const admin = sessionIsAdmin(user)
  const [events, setEvents] = useState<WatchEvent[]>([])
  const [sessions, setSessions] = useState<WatchSession[]>([])
  const [includeViews, setIncludeViews] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const reload = async (views = includeViews) => {
    const [nextEvents, nextSessions] = await Promise.all([
      listWatchEvents(views),
      listSignedInLogins(),
    ])
    setEvents(nextEvents)
    setSessions(nextSessions)
  }

  useEffect(() => {
    if (!admin) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    void Promise.all([listWatchEvents(includeViews), listSignedInLogins()])
      .then(([nextEvents, nextSessions]) => {
        if (cancelled) return
        setEvents(nextEvents)
        setSessions(nextSessions)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load the gym log.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [admin, includeViews])

  if (!admin) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h2 className="text-xl font-semibold text-[var(--text)]">Watch</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Only gym admin can open this log. Ask them if you need to know who
          used a sign-in link or who is still signed in.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Office
        </p>
        <span className={`${HOLD_BUILD_CHIP} mt-2`}>{HOLD_BUILD_LABEL}</span>
        <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">Watch</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          This is a gym log, not a legal record. Login changes, gym file saves,
          and feed / consent / stills from this browser carry a gym mark so
          another site cannot send them. A new sign-in on the same email ends
          the last one. Session ids stay on the server. Roster saves stay off
          this list unless you turn them on — the gym writes that file often.
        </p>
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="text-lg font-semibold text-[var(--text)]">Signed in now</h3>
        {loading && <p className="mt-3 text-sm text-[var(--muted)]">Loading who is signed in…</p>}
        {!loading && sessions.length === 0 && (
          <p className="mt-3 text-sm text-[var(--muted)]">No live logins right now.</p>
        )}
        {!loading && sessions.length > 0 && (
          <ul className="mt-4 space-y-3">
            {sessions.map((row) => (
              <li
                key={`${row.accountId}-${row.createdAt}`}
                className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-3"
              >
                <p className="font-semibold text-[var(--text)]">{row.displayName}</p>
                <p className="text-xs text-[var(--muted)]">
                  {row.email} · {row.role}
                  {row.kiosk ? ' · floor iPad' : ''}
                  {row.self ? ' · this browser' : ''}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Since {watchWhen(row.createdAt)}
                </p>
                {!row.self && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true)
                      setSaved(null)
                      void endSignedInLogin(row.accountId)
                        .then(async () => {
                          setSaved(`Ended ${row.displayName}'s login.`)
                          await reload()
                        })
                        .catch((err) =>
                          setError(err instanceof Error ? err.message : 'Could not end that login.'),
                        )
                        .finally(() => setBusy(false))
                    }}
                    className="mt-3 rounded-full border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
                  >
                    End this login
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--text)]">Recent actions</h3>
          <label className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <input
              type="checkbox"
              checked={includeViews}
              onChange={(e) => setIncludeViews(e.target.checked)}
            />
            Show roster opens and saves
          </label>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Routine roster opens and saves are hidden unless you turn that on.
          The gym writes that file often, so they crowd out the useful lines.
        </p>
        {loading && <p className="mt-3 text-sm text-[var(--muted)]">Loading the gym log…</p>}
        {!loading && events.length === 0 && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            No sign-ins, links, or office opens recorded yet.
          </p>
        )}
        {!loading && events.length > 0 && (
          <ul className="mt-4 space-y-2">
            {events.map((row, index) => (
              <li
                key={`${row.at}-${row.action}-${index}`}
                className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-3"
              >
                <p className="text-sm font-semibold text-[var(--text)]">
                  {watchActionLabel(row.action)}
                </p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {watchWhen(row.at)}
                  {row.actorEmail ? ` · ${row.actorEmail}` : ''}
                  {row.actorRole ? ` · ${row.actorRole}` : ''}
                </p>
                {row.detail && (
                  <p className="mt-1 break-words text-xs text-[var(--muted)]">{row.detail}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      {saved && <p className="text-sm text-[var(--accent)]">{saved}</p>}
    </div>
  )
}
