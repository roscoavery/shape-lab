import { useMemo, useState } from 'react'
import type { Athlete, HomeworkItem, InjuryEntry, PainJournalEntry } from '../../types'
import { CARE_RESOURCES, getCatalogItem } from '../../config/homeworkCatalog'

type Props = {
  athlete: Athlete | null
  injuryLogs: InjuryEntry[]
  painJournal: PainJournalEntry[]
  backItems: HomeworkItem[]
  onFlagInjury: (active: boolean) => void
  onSaveInjury: (entry: Omit<InjuryEntry, 'id' | 'athleteId' | 'date'>) => void
  onSaveJournal: (entry: Omit<PainJournalEntry, 'id' | 'athleteId' | 'date'>) => void
  onTrain: (item: HomeworkItem) => void
  onAddBackCare: (catalogId: string) => void
}

const BODY_PARTS = [
  'low back',
  'knee',
  'wrist',
  'shoulder',
  'ankle',
  'neck',
  'hip',
  'other',
]

export function CarePanel({
  athlete,
  injuryLogs,
  painJournal,
  backItems,
  onFlagInjury,
  onSaveInjury,
  onSaveJournal,
  onTrain,
  onAddBackCare,
}: Props) {
  const [part, setPart] = useState(athlete?.hasBackPain ? 'low back' : '')
  const [level, setLevel] = useState('3')
  const [what, setWhat] = useState('')
  const [where, setWhere] = useState('')
  const [started, setStarted] = useState('')
  const [worse, setWorse] = useState('')
  const [better, setBetter] = useState('')
  const [doctor, setDoctor] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState<string | null>(null)

  const [jPain, setJPain] = useState('2')
  const [jFelt, setJFelt] = useState('')
  const [jNotes, setJNotes] = useState('')

  const latest = injuryLogs[0]
  const showBack = Boolean(athlete?.hasBackPain) || part === 'low back' || latest?.bodyPart === 'low back'
  const showKnee = part === 'knee' || latest?.bodyPart === 'knee'

  const painTrend = useMemo(() => {
    return [...painJournal].slice(0, 8).reverse()
  }, [painJournal])

  const flash = (msg: string) => {
    setSaved(msg)
    window.setTimeout(() => setSaved(null), 2800)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl border border-[var(--accent)]/35 bg-[#102820] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          This is temporary
        </p>
        <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">
          You will get back to being active
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
          Pain is information, not a life sentence. Write what you feel, do the
          work you can handle today, and keep the notes your doctor gave you
          where you can find them. Healing is a trail, not a switch.
        </p>
        <button
          type="button"
          onClick={() => onFlagInjury(!athlete?.injuryActive)}
          className={`mt-3 rounded-lg px-3 py-2 text-sm font-semibold ${
            athlete?.injuryActive
              ? 'bg-[var(--warn)] text-[#241a05]'
              : 'bg-[var(--accent)] text-[#06281f]'
          }`}
        >
          {athlete?.injuryActive ? 'I am feeling better — clear the flag' : "I'm dealing with an injury"}
        </button>
      </div>

      <section className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold text-[var(--text)]">Injury check-in</h4>
        <p className="text-xs text-[var(--muted)]">
          What hurts, where, and what you want to remember. This stays on your profile.
        </p>
        <label className="text-xs text-[var(--muted)]">
          Where
          <select
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={part}
            onChange={(e) => setPart(e.target.value)}
          >
            <option value="">Pick a place…</option>
            {BODY_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[var(--muted)]">
          Pain level today (0–10)
          <input
            inputMode="numeric"
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          What hurts
          <input
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            placeholder="Sharp on the inside of the knee when I land…"
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          Exactly where
          <input
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            placeholder="Left low back, one inch left of the spine"
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          When did this start?
          <input
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={started}
            onChange={(e) => setStarted(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          What makes it worse
          <input
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={worse}
            onChange={(e) => setWorse(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          What helps
          <input
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            value={better}
            onChange={(e) => setBetter(e.target.value)}
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          What the doctor asked you to remember
          <textarea
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            rows={3}
            value={doctor}
            onChange={(e) => setDoctor(e.target.value)}
            placeholder="PT notes, restrictions, next appointment…"
          />
        </label>
        <label className="text-xs text-[var(--muted)]">
          Anything else
          <textarea
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            if (!part || !what.trim()) {
              flash('Tell us where and what hurts.')
              return
            }
            onSaveInjury({
              bodyPart: part,
              painLevel: Math.min(10, Math.max(0, Number(level) || 0)),
              whatHurts: what.trim(),
              where: where.trim(),
              startedWhen: started.trim() || undefined,
              worseWhen: worse.trim() || undefined,
              betterWhen: better.trim() || undefined,
              doctorNotes: doctor.trim() || undefined,
              notes: notes.trim() || undefined,
            })
            flash('Saved. That is one more honest note on the way back.')
          }}
          className="self-start rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
        >
          Save check-in
        </button>
      </section>

      {injuryLogs.length > 0 && (
        <section>
          <h4 className="text-sm font-semibold text-[var(--text)]">Healing log</h4>
          <ul className="mt-2 space-y-2">
            {injuryLogs.slice(0, 8).map((e) => (
              <li
                key={e.id}
                className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2 text-sm"
              >
                <p className="font-medium text-[var(--text)]">
                  {e.bodyPart} · {e.painLevel}/10 · {new Date(e.date).toLocaleDateString()}
                </p>
                <p className="text-[var(--muted)]">{e.whatHurts}</p>
                {e.doctorNotes ? (
                  <p className="mt-1 text-xs text-[var(--accent)]">Doctor: {e.doctorNotes}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {showBack && (
        <section className="flex flex-col gap-3 rounded-xl border border-[var(--panel-border)] bg-[#121820] p-4">
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)]">Back care</h4>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Expose the tissue to what it can handle. Do not chase a hero set.
              Glute bridges and back-extension holds first; reps only after a
              two-minute pain-free back-extension hold.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(['glute_bridge', 'back_extension'] as const).map((id) => {
              const cat = getCatalogItem(id)!
              const existing = backItems.find((i) => i.catalogId === id)
              return (
                <div key={id} className="rounded-lg border border-[var(--panel-border)] p-3">
                  <p className="font-semibold text-[var(--text)]">{cat.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{cat.cues[0]}</p>
                  {existing ? (
                    <button
                      type="button"
                      onClick={() => onTrain(existing)}
                      className="mt-2 rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Train
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onAddBackCare(id)}
                      className="mt-2 rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs"
                    >
                      Add to homework
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text)]">Journal this session</p>
            <label className="mt-2 block text-xs text-[var(--muted)]">
              Pain after (0–10)
              <input
                inputMode="numeric"
                className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3"
                value={jPain}
                onChange={(e) => setJPain(e.target.value)}
              />
            </label>
            <label className="mt-2 block text-xs text-[var(--muted)]">
              What seemed to help or flare
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
                rows={3}
                value={jFelt}
                onChange={(e) => setJFelt(e.target.value)}
              />
            </label>
            <label className="mt-2 block text-xs text-[var(--muted)]">
              Notes
              <textarea
                className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
                rows={2}
                value={jNotes}
                onChange={(e) => setJNotes(e.target.value)}
              />
            </label>
            <button
              type="button"
              onClick={() => {
                onSaveJournal({
                  painLevel: Math.min(10, Math.max(0, Number(jPain) || 0)),
                  felt: jFelt.trim() || undefined,
                  notes: jNotes.trim() || undefined,
                })
                flash('Journal saved. Patterns show up when you keep writing.')
                setJFelt('')
                setJNotes('')
              }}
              className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            >
              Save journal
            </button>
          </div>
          {painTrend.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--muted)]">Pain over time</p>
              <ul className="mt-1 space-y-1 text-sm">
                {painTrend.map((row) => (
                  <li key={row.id} className="flex justify-between gap-2 text-[var(--text)]">
                    <span>{new Date(row.date).toLocaleDateString()}</span>
                    <span className="tabular-nums">{row.painLevel}/10</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ResourceCard kind="back" />
        </section>
      )}

      {showKnee && <ResourceCard kind="knee" />}

      {saved && <p className="text-sm text-[var(--accent)]">{saved}</p>}
    </div>
  )
}

function ResourceCard({ kind }: { kind: 'back' | 'knee' }) {
  const rec = CARE_RESOURCES[kind]
  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        People who teach this well
      </p>
      <p className="mt-1 font-semibold text-[var(--text)]">{rec.name}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{rec.why}</p>
      <ul className="mt-2 space-y-1">
        {rec.links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[var(--accent)] underline"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
