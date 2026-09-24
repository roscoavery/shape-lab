import type { Athlete } from '../../types'
import { groupAthletesByGoal, surfaceLabel } from '../../lib/skillPaths'
import { AthleteName } from '../AthleteAvatar'
import { SkillPathPreview } from './SkillPathPreview'

type Props = {
  athletes: Athlete[]
  onViewProfile?: (id: string) => void
  onOpenBuilder?: () => void
}

export function GoalGroupBoard({ athletes, onViewProfile, onOpenBuilder }: Props) {
  const groups = groupAthletesByGoal(athletes)
  return (
    <section className="mt-3 rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Group by hope
          </p>
          <h4 className="mt-1 text-lg font-semibold">What they said they want</h4>
          <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
            Same skill stays one group even if someone named dead mat. The surface is a spec of that hope, not a different skill.
          </p>
        </div>
        {onOpenBuilder && (
          <button
            type="button"
            onClick={onOpenBuilder}
            className="rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold"
          >
            Edit skill paths
          </button>
        )}
      </div>
      <div className="mt-3 grid gap-3">
        {groups.map((group) => (
          <div key={group.key} className="rounded-xl bg-[#0d1218] p-3">
            <p className="text-sm font-bold">
              {group.label}
              <span className="ml-2 text-xs font-medium text-[var(--muted)]">
                {group.athletes.length}
              </span>
            </p>
            {group.surfaces.length > 0 && (
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                Specs named · {group.surfaces.map(surfaceLabel).join(', ')}
              </p>
            )}
            <ul className="mt-2 grid gap-1.5">
              {group.athletes.map(({ athlete: a, surface }) => (
                <li key={`${a.id}-${surface ?? 'any'}`}>
                  <button
                    type="button"
                    onClick={() => onViewProfile?.(a.id)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm"
                  >
                    <span className="min-w-0">
                      <AthleteName athlete={a} />
                      {surface ? (
                        <span className="ml-1 text-xs text-[var(--muted)]">· {surfaceLabel(surface)}</span>
                      ) : null}
                    </span>
                    <span className="text-xs text-[var(--accent)]">View</span>
                  </button>
                </li>
              ))}
            </ul>
            {group.skillId && group.athletes[0]?.athlete.skillGoals && (
              <div className="mt-3">
                <SkillPathPreview
                  coachView
                  goals={group.athletes[0].athlete.skillGoals.filter(
                    (g) => (g.skillId ?? g.label) && (g.skillId === group.skillId || g.label === group.label),
                  )}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
