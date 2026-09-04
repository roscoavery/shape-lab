import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { athleteContact } from '../lib/gymBackup'
import {
  enableServerRosterPush,
  isServerRosterPushEnabled,
  pushThisDeviceToGym,
} from '../lib/rosterSync'
import { lastShapeTest, formatQuizScore } from '../lib/quizGrades'
import { buildGymBackup, downloadGymBackup } from '../lib/gymBackup'
import { roleLabel } from '../lib/profileRole'
import { AthleteAvatar } from './AthleteAvatar'

type PersistInfo = {
  mode: 'blob' | 'disk' | 'tmp'
  lasting: boolean
}

type Props = {
  athletes: Athlete[]
  onAthletes: (next: Athlete[]) => void
}

export function GymRecords({ athletes }: Props) {
  const [persist, setPersist] = useState<PersistInfo | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetch('/api/persist')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PersistInfo | null) => {
        if (data?.mode) setPersist(data)
      })
      .catch(() => {})
  }, [athletes.length])

  useEffect(() => {
    if (athletes.length === 0) return
    // Only push after a successful GET. Enabling push from a Ryan-only phone
    // used to look like “saved” while the gym file never loaded.
    if (!isServerRosterPushEnabled()) return
    void pushThisDeviceToGym().catch(() => {})
  }, [athletes.length])

  const contacts = athletes.map((a) => ({
    athlete: a,
    ...athleteContact(a),
    last: lastShapeTest(a),
  }))
  const withPhone = contacts.filter((c) => c.phone || c.parentPhone || c.email).length

  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(null), 6000)
  }

  const saveToLink = async () => {
    setBusy(true)
    try {
      enableServerRosterPush()
      const result = await pushThisDeviceToGym()
      if (!result.ok) {
        flash(result.error || 'Could not send this device’s gym file.')
        return
      }
      flash(
        persist?.lasting
          ? `Sent ${result.profiles} profiles and ${result.photos} picture${result.photos === 1 ? '' : 's'} from this device. Open the same URL on the phone and laptop — no new Blob store.`
          : `Saved ${result.profiles} profiles on this link. This project still needs its existing Blob connected — do not create a second one.`,
      )
    } catch {
      flash('Could not reach the gym link from this phone. Stay on the same URL and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">This gym</p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Athletes on this link</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        On this same gym URL, every device reads and writes the same gym file:
        new athlete profiles and edits, photos, coach notes, homework and class-clock
        logs, feed and Wins posts, lessons, classes, research, and videos the app
        records or uploads. You do not need a spreadsheet.
      </p>

      {persist && !persist.lasting && (
        <p className="mt-3 rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          This Vercel project is not keeping gym data overnight yet. In this project:
          Storage → Create Database → Blob. Check{' '}
          <code className="text-xs">Add a read-write token</code>. Then redeploy
          Production on this same URL. Until that is on, phones can look saved and
          then go blank after a cold start.
        </p>
      )}
      {persist?.lasting && (
        <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          Blob is already on. Do not make another store. The iPad still has
          pictures the gym file is missing — send them from this page, then
          hard-refresh the phone and laptop on this same URL.
        </p>
      )}

      <p className="mt-3 text-sm text-[var(--muted)]">
        {athletes.length} profile{athletes.length === 1 ? '' : 's'}
        {withPhone ? ` · ${withPhone} with a phone or email` : ''}
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0d1218] text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2 font-medium">Photo</th>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Parent</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Last test</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((row) => (
              <tr key={row.athlete.id} className="border-t border-[var(--panel-border)]">
                <td className="px-3 py-2">
                  <AthleteAvatar athlete={row.athlete} size="md" />
                </td>
                <td className="px-3 py-2 font-medium text-[var(--text)]">{row.name}</td>
                <td className="px-3 py-2 text-[var(--muted)]">{roleLabel(row.athlete)}</td>
                <td className="px-3 py-2">{row.phone || '—'}</td>
                <td className="px-3 py-2">{row.parentPhone || '—'}</td>
                <td className="px-3 py-2">{row.email || '—'}</td>
                <td className="px-3 py-2 text-[var(--muted)]">
                  {row.last ? formatQuizScore(row.last) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveToLink()}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
        >
          Send everything on this device
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void buildGymBackup().then((backup) => {
              downloadGymBackup(backup)
              flash(
                `Saved a gym file with ${backup.roster.athletes.length} profiles onto this iPad. Keep that file in Files / iCloud.`,
              )
            })
          }}
          className="rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold"
        >
          Download gym file
        </button>
      </div>
      {status && <p className="mt-2 text-sm text-[var(--accent)]">{status}</p>}
    </section>
  )
}
