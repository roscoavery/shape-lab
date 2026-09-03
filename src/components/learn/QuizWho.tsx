import { useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import {
  displayPersonName,
  loadQuizGuests,
  namesMatch,
  rememberQuizGuest,
  splitPersonName,
} from '../../lib/classStation'
import { formatQuizScore, lastGuestGrade, lastShapeTest } from '../../lib/quizGrades'
import { AthleteName } from '../AthleteAvatar'

export type QuizTaker = {
  athleteId?: string
  firstName: string
  lastName: string
}

type Props = {
  athletes: Athlete[]
  preset?: QuizTaker | null
  /** People from the open class — show them first so roll is easy. */
  preferredIds?: string[]
  onReady: (taker: QuizTaker) => void
  onExit: () => void
}

export function QuizWho({ athletes, preset, preferredIds = [], onReady, onExit }: Props) {
  const [mode, setMode] = useState<'pick' | 'type'>(preset ? 'type' : 'pick')
  const [first, setFirst] = useState(preset?.firstName ?? '')
  const [last, setLast] = useState(preset?.lastName ?? '')
  const [filter, setFilter] = useState('')
  const guests = loadQuizGuests()

  const roster = useMemo(
    () => athletes.filter((a) => profileRole(a) === 'athlete' || !a.role),
    [athletes],
  )
  const q = filter.trim().toLowerCase()
  const preferred = new Set(preferredIds)
  const visible = roster
    .filter((a) => !q || a.name.toLowerCase().includes(q))
    .slice()
    .sort((a, b) => {
      const ap = preferred.has(a.id) ? 0 : 1
      const bp = preferred.has(b.id) ? 0 : 1
      if (ap !== bp) return ap - bp
      return a.name.localeCompare(b.name)
    })
  const visibleGuests = guests.filter((g) => {
    const already = roster.some((a) => namesMatch(a, g.firstName, g.lastName))
    const name = displayPersonName(g.firstName, g.lastName).toLowerCase()
    return !already && (!q || name.includes(q))
  })

  const choose = (firstName: string, lastName: string, athleteId?: string) => {
    const existing =
      athleteId ?? roster.find((a) => namesMatch(a, firstName, lastName))?.id
    if (!existing) rememberQuizGuest(firstName, lastName)
    onReady({ firstName, lastName, athleteId: existing })
  }

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
        Shape test
      </p>
      <h3 className="mt-1 text-2xl font-semibold text-[var(--text)]">Who is taking this?</h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
        First and last name, or pick a profile. If a class is open, names from
        that class sit at the top — tapping one also marks roll.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setMode('pick')}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === 'pick' ? 'bg-[var(--accent)] text-[#06281f]' : 'border border-[var(--panel-border)]'
          }`}
        >
          Pick a name
        </button>
        <button
          type="button"
          onClick={() => setMode('type')}
          className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
            mode === 'type' ? 'bg-[var(--accent)] text-[#06281f]' : 'border border-[var(--panel-border)]'
          }`}
        >
          Type a name
        </button>
      </div>

      {mode === 'pick' ? (
        <div className="mt-4 flex flex-col gap-2">
          <input
            className="h-12 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3"
            placeholder="Search…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {visibleGuests.map((g) => {
              const last = lastGuestGrade(g.firstName, g.lastName)
              return (
                <button
                  key={`${g.firstName}-${g.lastName}`}
                  type="button"
                  onClick={() => choose(g.firstName, g.lastName)}
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--accent)]/35 bg-[#102820] px-4 py-3 text-left"
                >
                  <span>
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                      Typed a name, no profile yet
                    </span>
                    <span className="text-base font-semibold">
                      {displayPersonName(g.firstName, g.lastName)}
                    </span>
                    {last ? (
                      <span className="mt-0.5 block text-xs font-medium text-white/70">
                        Last: {formatQuizScore(last)}
                      </span>
                    ) : null}
                  </span>
                  <span className="text-xs text-[var(--muted)]">Use</span>
                </button>
              )
            })}
            {visible.map((a) => {
              const parts = splitPersonName(a.name)
              const last = lastShapeTest(a)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    choose(a.firstName || parts.firstName, a.lastName || parts.lastName, a.id)
                  }
                  className="flex w-full items-center justify-between rounded-2xl border border-[var(--panel-border)] bg-[#121820] px-4 py-3 text-left"
                >
                  <span>
                    {preferred.has(a.id) ? (
                      <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                        This class
                      </span>
                    ) : null}
                    <AthleteName athlete={a} size="md" nameClassName="text-base font-semibold" />
                  </span>
                  {last ? (
                    <span className="text-xs font-medium text-[var(--accent)]">
                      Last: {formatQuizScore(last)}
                    </span>
                  ) : null}
                </button>
              )
            })}
            {visible.length + visibleGuests.length === 0 && (
              <p className="text-sm text-[var(--muted)]">No matches. Type a name instead.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <input
            autoFocus
            className="h-14 rounded-2xl border border-[var(--panel-border)] bg-[#0d1218] px-4 text-lg"
            placeholder="First name"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
          <input
            className="h-14 rounded-2xl border border-[var(--panel-border)] bg-[#0d1218] px-4 text-lg"
            placeholder="Last name"
            value={last}
            onChange={(e) => setLast(e.target.value)}
          />
          <button
            type="button"
            disabled={!first.trim() || !last.trim()}
            onClick={() => choose(first.trim(), last.trim())}
            className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
          >
            That’s me
          </button>
        </div>
      )}

      <button type="button" className="mt-4 text-sm text-[var(--accent)]" onClick={onExit}>
        Back to Learn
      </button>
    </section>
  )
}
