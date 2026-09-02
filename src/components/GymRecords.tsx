import { useEffect, useState } from 'react'
import type { Athlete } from '../types'
import { athleteContact } from '../lib/gymBackup'
import { enableServerRosterPush, localRosterSnapshot, pushServerRoster } from '../lib/rosterSync'
import { lastShapeTest, formatQuizScore } from '../lib/quizGrades'
import { roleLabel } from '../lib/profileRole'

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
    enableServerRosterPush()
    void pushServerRoster(localRosterSnapshot()).catch(() => {})
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
      await pushServerRoster(localRosterSnapshot())
      flash(
        persist?.lasting
          ? `Saved ${athletes.length} profiles on this gym link. They stay here for the next class.`
          : `Saved ${athletes.length} profiles on this gym link. Add a Blob store on this Vercel project so they still show up tomorrow.`,
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
        Names, parent phones, and class photos stay in the app on this same gym URL.
        New profiles save here automatically. You do not need a spreadsheet.
      </p>

      {persist && !persist.lasting && (
        <p className="mt-3 rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          This Vercel project is not keeping profiles overnight yet. In this project:
          Storage → Create Database → Blob. That adds{' '}
          <code className="text-xs">BLOB_READ_WRITE_TOKEN</code>. Then redeploy
          Production on this same URL. After that, class sign-ups stay in the app.
        </p>
      )}
      {persist?.lasting && (
        <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          This gym link is keeping profiles. Athletes who sign up here will still be
          here next class.
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
                  {row.athlete.photoDataUrl ? (
                    <img
                      src={row.athlete.photoDataUrl}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
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

      <div className="mt-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveToLink()}
          className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
        >
          Save profiles to this gym
        </button>
      </div>
      {status && <p className="mt-2 text-sm text-[var(--accent)]">{status}</p>}
    </section>
  )
}
