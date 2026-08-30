import type { AppTab } from '../../lib/storage'
import { profileRole, roleLabel } from '../../lib/profileRole'
import type { Athlete, AthleteTaskProgress, AttemptRecord } from '../../types'

type Props = {
  athletes: Athlete[]
  activeAthleteId: string | null
  taskProgress: AthleteTaskProgress | null
  attempts: AttemptRecord[]
  onSelectAthlete: (id: string | null) => void
  onGo: (tab: AppTab) => void
}

function displayDate() {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
}

export function TodayDashboard({
  athletes,
  activeAthleteId,
  taskProgress,
  attempts,
  onSelectAthlete,
  onGo,
}: Props) {
  const activeAthlete = athletes.find((athlete) => athlete.id === activeAthleteId) ?? null
  const recentProfiles = [...athletes]
    .sort((a, b) => {
      if (a.id === activeAthleteId) return -1
      if (b.id === activeAthleteId) return 1
      return Date.parse(b.createdAt) - Date.parse(a.createdAt)
    })
    .slice(0, 4)
  const savedAttempts = activeAthleteId
    ? attempts.filter((attempt) => attempt.athleteId === activeAthleteId).length
    : 0
  const completedTasks = taskProgress
    ? Object.values(taskProgress.completions).reduce((total, count) => total + count, 0)
    : 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          {displayDate()}
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[var(--text)]">Today&apos;s coaching board</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {activeAthlete
                ? `${activeAthlete.name} is selected. Continue a lesson or open a coaching tool.`
                : 'Select an athlete, then open a lesson or coaching tool.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onGo('history')}
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm font-semibold text-[var(--text)] hover:border-[var(--accent)]/60"
          >
            Profiles
          </button>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.85fr)]">
        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                  Current lesson workspace
                </p>
                <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">
                  {activeAthlete ? `${activeAthlete.name} · Class flow` : 'Class-flow lesson'}
                </h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                  Run the existing guided sequence workspace with scoring, holds, replays,
                  and saved progress. Custom lesson plans and notes are added in Phase 3.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onGo('tasks2')}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-bold text-black hover:brightness-110"
              >
                Open workspace
              </button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[var(--panel-border)] bg-black/10 p-3">
                <span className="block text-xl font-bold text-[var(--text)]">{completedTasks}</span>
                <span className="text-xs text-[var(--muted)]">task completions</span>
              </div>
              <div className="rounded-xl border border-[var(--panel-border)] bg-black/10 p-3">
                <span className="block text-xl font-bold text-[var(--text)]">{savedAttempts}</span>
                <span className="text-xs text-[var(--muted)]">saved attempts</span>
              </div>
              <div className="col-span-2 rounded-xl border border-[var(--panel-border)] bg-black/10 p-3 sm:col-span-1">
                <span className="block truncate text-sm font-bold text-[var(--text)]">
                  {activeAthlete ? roleLabel(activeAthlete) : 'No athlete'}
                </span>
                <span className="text-xs text-[var(--muted)]">lesson context</span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
                Lesson board
              </p>
              <h3 className="mt-1 text-lg font-semibold text-[var(--text)]">Plan today&apos;s work</h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => onGo('tasks2')}
                className="rounded-xl border border-[var(--panel-border)] p-4 text-left hover:border-[var(--accent)]/60"
              >
                <span className="block font-semibold text-[var(--text)]">Class-flow plans</span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">
                  Guided sequences, hold challenges, scoring, and review.
                </span>
              </button>
              <button
                type="button"
                onClick={() => onGo('homework')}
                className="rounded-xl border border-[var(--panel-border)] p-4 text-left hover:border-[var(--accent)]/60"
              >
                <span className="block font-semibold text-[var(--text)]">Assigned homework</span>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">
                  Review the selected athlete&apos;s assigned shapes and holds.
                </span>
              </button>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text)]">Recent profiles</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Select lesson context without leaving Today.</p>
            <div className="mt-3 flex flex-col gap-2">
              {recentProfiles.map((athlete) => {
                const selected = athlete.id === activeAthleteId
                return (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => onSelectAthlete(athlete.id)}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2 text-left ${
                      selected
                        ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                        : 'border-[var(--panel-border)] hover:border-[var(--accent)]/50'
                    }`}
                  >
                    <span className="truncate text-sm font-semibold text-[var(--text)]">
                      {athlete.name}
                    </span>
                    <span className="ml-2 shrink-0 text-[11px] text-[var(--muted)]">
                      {profileRole(athlete).replace('_', ' ')}
                    </span>
                  </button>
                )
              })}
              {recentProfiles.length === 0 && (
                <p className="rounded-xl border border-dashed border-[var(--panel-border)] p-3 text-sm text-[var(--muted)]">
                  No profiles yet. Open Profiles to create one.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
            <h3 className="text-lg font-semibold text-[var(--text)]">Quick tools</h3>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => onGo('compare')}
                className="rounded-xl border border-[var(--panel-border)] px-3 py-3 text-left hover:border-[var(--accent)]/60"
              >
                <span className="block text-sm font-semibold text-[var(--text)]">Videos / Compare</span>
                <span className="text-xs text-[var(--muted)]">Delay camera, Replay Last, and Record</span>
              </button>
              <button
                type="button"
                onClick={() => onGo('learn')}
                className="rounded-xl border border-[var(--panel-border)] px-3 py-3 text-left hover:border-[var(--accent)]/60"
              >
                <span className="block text-sm font-semibold text-[var(--text)]">Shape library</span>
                <span className="text-xs text-[var(--muted)]">References, descriptions, and quizzes</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
