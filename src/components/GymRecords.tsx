import { useEffect, useRef, useState } from 'react'
import type { Athlete } from '../types'
import {
  applyGymBackup,
  athleteContact,
  buildGymBackup,
  downloadGymBackup,
  parseGymBackup,
} from '../lib/gymBackup'
import { loadResearch } from '../lib/research'
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

export function GymRecords({ athletes, onAthletes }: Props) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [persist, setPersist] = useState<PersistInfo | null>(null)
  const [researchCount, setResearchCount] = useState<number | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void fetch('/api/persist')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PersistInfo | null) => {
        if (data?.mode) setPersist(data)
      })
      .catch(() => {})
    void loadResearch().then((file) => setResearchCount(file.observations.length))
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
      const backup = await buildGymBackup()
      await applyGymBackup(backup)
      flash(
        persist?.lasting
          ? `Saved ${athletes.length} profiles and ${backup.research.observations.length} research answers to this gym link.`
          : `Pushed ${athletes.length} profiles from this phone. This Vercel link has no lasting store yet — download a backup too, and add a Blob token on the claimed project.`,
      )
    } catch {
      flash('Could not reach the gym link. Download a backup from this phone.')
    } finally {
      setBusy(false)
    }
  }

  const exportBackup = async () => {
    setBusy(true)
    try {
      const backup = await buildGymBackup()
      downloadGymBackup(backup)
      flash(
        `Downloaded ${backup.roster.athletes.length} profiles and ${backup.research.observations.length} research answers.`,
      )
    } finally {
      setBusy(false)
    }
  }

  const importFile = async (file: File) => {
    setBusy(true)
    try {
      const parsed = parseGymBackup(JSON.parse(await file.text()))
      if (!parsed) {
        flash('That file is not a Shape Lab gym backup.')
        return
      }
      const { athletes: next } = await applyGymBackup(parsed)
      onAthletes(next)
      flash(
        `Loaded ${parsed.roster.athletes.length} profiles and ${parsed.research.observations.length} research answers.`,
      )
    } catch {
      flash('Could not read that backup file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Gym records</p>
      <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Phones, emails, research</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        Profiles live on the phone that created them and try to copy to this link. A
        temporary Vercel URL only keeps that copy if the project has a Blob store.
        Claiming the link does not create Blob by itself.
      </p>

      {persist && !persist.lasting && (
        <p className="mt-3 rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          This link is ephemeral. New profiles will vanish after a cold start.
          On Vercel: Storage → Blob → copy <code className="text-xs">BLOB_READ_WRITE_TOKEN</code> into
          Environment Variables → Redeploy. Until then, download a backup from the
          class iPad.
        </p>
      )}
      {persist?.lasting && (
        <p className="mt-3 rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          This link has a lasting store. Profiles saved here should show up tomorrow
          on the same URL.
        </p>
      )}

      <p className="mt-3 text-sm text-[var(--muted)]">
        {athletes.length} profile{athletes.length === 1 ? '' : 's'} on this phone
        {withPhone ? ` · ${withPhone} with a phone or email` : ''}
        {researchCount != null ? ` · ${researchCount} research answer${researchCount === 1 ? '' : 's'}` : ''}
      </p>

      <div className="mt-3 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#0d1218] text-[11px] uppercase tracking-wider text-[var(--muted)]">
            <tr>
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
          Save this phone to the gym link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void exportBackup()}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold"
        >
          Download gym backup
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold"
        >
          Load a backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void importFile(file)
          }}
        />
      </div>
      {status && <p className="mt-2 text-sm text-[var(--accent)]">{status}</p>}
    </section>
  )
}
