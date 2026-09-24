import { useCallback, useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile } from '../../lib/profileRole'
import { digitsOnlyPin } from '../../lib/athletePasscode'
import {
  authorizeCalendarApi,
  connectICloud,
  disconnectCalendar,
  fetchCalendarStatus,
  syncCalendarNow,
  updateCalendarSelection,
  type CalendarConnectionView,
  type ConnectedCalendarView,
} from '../../lib/calendarClient'

const APPLE_APP_PASSWORD_URL =
  'https://support.apple.com/en-us/102654'

type Props = {
  coach: Athlete
}

export function CalendarConnections({ coach }: Props) {
  const [status, setStatus] = useState<{
    connected: boolean
    connection?: CalendarConnectionView
    calendars?: ConnectedCalendarView[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [coachPasscode, setCoachPasscode] = useState('')
  const [apiReady, setApiReady] = useState(false)
  const [email, setEmail] = useState('')
  const [appPassword, setAppPassword] = useState('')
  const [eventFilter, setEventFilter] = useState<'all' | 'coaching_likely'>('coaching_likely')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!apiReady) return
    setLoading(true)
    try {
      const s = await fetchCalendarStatus()
      setStatus(s)
      if (s.connection?.eventFilter) setEventFilter(s.connection.eventFilter)
    } catch {
      setStatus({ connected: false })
    } finally {
      setLoading(false)
    }
  }, [apiReady])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!isCoachProfile(coach)) return null

  const unlockApi = async () => {
    setError(null)
    setBusy(true)
    try {
      const ok = await authorizeCalendarApi(coach.id, digitsOnlyPin(coachPasscode))
      if (!ok) {
        setError('Passcode did not match this coach profile.')
        return
      }
      setApiReady(true)
      setCoachPasscode('')
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  const onConnect = async () => {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      if (!apiReady) {
        const ok = await authorizeCalendarApi(coach.id, digitsOnlyPin(coachPasscode))
        if (!ok) {
          setError('Enter your coach passcode first.')
          return
        }
        setApiReady(true)
      }
      const result = await connectICloud(email.trim(), appPassword.trim())
      setAppPassword('')
      setStatus({
        connected: true,
        connection: result.connection,
        calendars: result.calendars,
      })
      setMessage('iCloud connected. Choose calendars below, then Sync now.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not connect to iCloud.')
    } finally {
      setBusy(false)
    }
  }

  const onSaveCalendars = async () => {
    if (!status?.calendars) return
    setBusy(true)
    setError(null)
    try {
      await updateCalendarSelection(
        status.calendars.map((c) => ({
          providerCalendarId: c.providerCalendarId,
          enabled: c.enabled,
        })),
        eventFilter,
      )
      setMessage('Calendar selection saved.')
      await refresh()
    } catch {
      setError('Could not save calendar settings.')
    } finally {
      setBusy(false)
    }
  }

  const onSync = async () => {
    setBusy(true)
    setError(null)
    try {
      await syncCalendarNow()
      setMessage('Calendar synced.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sync failed.')
    } finally {
      setBusy(false)
    }
  }

  const onDisconnect = async () => {
    if (!confirm('Disconnect iCloud? Stored credentials and cached events will be removed. Lessons in Shape Lab stay.')) {
      return
    }
    setBusy(true)
    try {
      await disconnectCalendar()
      setStatus({ connected: false })
      setApiReady(false)
      setMessage('Disconnected.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Coach settings</p>
      <h3 className="text-lg font-semibold">Calendar connections</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Connect iCloud with an Apple-generated app-specific password. Shape Lab never asks for your
        normal Apple Account password. Credentials stay on the server and are encrypted at rest.
      </p>

      {!apiReady && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Coach passcode (unlock calendar API)
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={4}
              value={coachPasscode}
              onChange={(e) => setCoachPasscode(digitsOnlyPin(e.target.value))}
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={busy || coachPasscode.length < 4}
            onClick={() => void unlockApi()}
            className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Continue
          </button>
        </div>
      )}

      {apiReady && !status?.connected && (
        <div className="mt-4 grid gap-3">
          <p className="text-sm text-[var(--muted)]">
            Create an app-specific password in Apple ID settings, then paste it here once.{' '}
            <a
              href={APPLE_APP_PASSWORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--accent)] underline"
            >
              Apple instructions
            </a>
          </p>
          <label className="flex flex-col gap-1 text-sm">
            Apple Account email
            <input
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            App-specific password
            <input
              type="password"
              autoComplete="off"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2"
            />
          </label>
          <button
            type="button"
            disabled={busy || !email.trim() || !appPassword.trim()}
            onClick={() => void onConnect()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-50"
          >
            Connect iCloud
          </button>
        </div>
      )}

      {apiReady && status?.connected && status.connection && (
        <div className="mt-4 grid gap-3">
          <div className="rounded-lg bg-[#121820] px-3 py-2 text-sm">
            <p>
              <span className="text-[var(--muted)]">Account · </span>
              {status.connection.appleIdEmail ?? 'iCloud'}
            </p>
            <p className="text-[var(--muted)]">
              Status {status.connection.status}
              {status.connection.lastSuccessfulSyncAt
                ? ` · Last sync ${new Date(status.connection.lastSuccessfulSyncAt).toLocaleString()}`
                : ''}
            </p>
            {status.connection.lastErrorCode && (
              <p className="text-amber-300">Last error: {status.connection.lastErrorCode}</p>
            )}
          </div>

          <fieldset className="text-sm">
            <legend className="font-medium">Events to show</legend>
            <label className="mt-2 flex items-center gap-2">
              <input
                type="radio"
                checked={eventFilter === 'coaching_likely'}
                onChange={() => setEventFilter('coaching_likely')}
              />
              Likely coaching events only
            </label>
            <label className="mt-1 flex items-center gap-2">
              <input
                type="radio"
                checked={eventFilter === 'all'}
                onChange={() => setEventFilter('all')}
              />
              All events from selected calendars
            </label>
          </fieldset>

          <ul className="flex flex-col gap-2">
            {(status.calendars ?? []).map((cal) => (
              <li key={cal.id} className="flex items-center gap-2 rounded-lg bg-[#121820] px-3 py-2">
                <input
                  type="checkbox"
                  checked={cal.enabled}
                  onChange={(e) => {
                    setStatus((prev) =>
                      prev?.calendars
                        ? {
                            ...prev,
                            calendars: prev.calendars.map((c) =>
                              c.id === cal.id ? { ...c, enabled: e.target.checked } : c,
                            ),
                          }
                        : prev,
                    )
                  }}
                />
                <span>{cal.displayName}</span>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSaveCalendars()}
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            >
              Save selection
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onSync()}
              className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-semibold text-white"
            >
              Sync now
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void onDisconnect()}
              className="rounded-lg border border-red-900/60 px-3 py-2 text-sm text-red-300"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {loading && apiReady && <p className="mt-2 text-xs text-[var(--muted)]">Loading…</p>}
      {message && <p className="mt-2 text-sm text-[var(--accent)]">{message}</p>}
      {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
    </section>
  )
}
