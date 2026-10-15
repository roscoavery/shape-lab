import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import {
  listTrainingEvents,
  subscribeTrainingEvents,
  eventKindLabel,
  deleteTrainingEvent,
  type TrainingEvent,
} from '../../lib/trainingEvents'
import { getAcroSkill } from '../../lib/acroSkills'
import { CollapsibleSection } from '../CollapsibleSection'

type Props = {
  athletes: Athlete[]
}

/**
 * Recaps for training events (clinic / group / school / camp).
 * Shows each event with its athletes and their acro skills,
 * so the coach can review who was there and what they worked on.
 */
export function TrainingEventRecapList({ athletes }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => subscribeTrainingEvents(() => setTick((n) => n + 1)), [])
  const [askDelete, setAskDelete] = useState<string | null>(null)

  const events = listTrainingEvents()
    .filter((e) => e.athleteIds.length > 0)
    .sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt))
    .slice(0, 10)

  if (events.length === 0) return null

  const athleteById = new Map(athletes.map((a) => [a.id, a]))

  return (
    <CollapsibleSection title="Group recaps" hint="Clinic, school, camp groups">
      <div className="space-y-3">
        {events.map((event: TrainingEvent) => {
          const eventAthletes = event.athleteIds
            .map((id) => athleteById.get(id))
            .filter((a): a is Athlete => !!a)
          if (eventAthletes.length === 0) return null
          return (
            <div
              key={event.id}
              className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold">
                  {event.name}
                  <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
                    {eventKindLabel(event.kind)}
                  </span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">
                    {eventAthletes.length} athlete{eventAthletes.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAskDelete(event.id)}
                    className="rounded-lg px-2 py-1 text-xs text-white/50 hover:bg-white/10 hover:text-white"
                    aria-label={`Delete ${event.name} recap`}
                  >
                    ✕
                  </button>
                </div>
              </div>
              {askDelete === event.id && (
                <div className="mt-2 rounded-xl border border-[var(--bad)]/40 bg-[var(--bad)]/10 p-3">
                  <p className="text-sm">
                    Delete this group recap? The athlete profiles stay, but the
                    recap leaves every device and stays gone.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteTrainingEvent(event.id)
                        setAskDelete(null)
                      }}
                      className="rounded-lg bg-[var(--bad)] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Yes, delete it
                    </button>
                    <button
                      type="button"
                      onClick={() => setAskDelete(null)}
                      className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-2 space-y-1.5">
                {eventAthletes.map((a) => {
                  const working = (a.acroWorkingTowards ?? [])
                    .map((id) => getAcroSkill(id)?.name)
                    .filter(Boolean) as string[]
                  const targets = (a.acroCoachTargets ?? [])
                    .map((id) => getAcroSkill(id)?.name)
                    .filter(Boolean) as string[]
                  return (
                    <div key={a.id} className="flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5">
                      {a.photoDataUrl ? (
                        <img src={a.photoDataUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-bold">
                          {(a.firstName?.[0] || '?').toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{a.name}</p>
                        {(working.length > 0 || targets.length > 0) && (
                          <p className="truncate text-[11px] text-[var(--muted)]">
                            {targets.length > 0 ? `Targets: ${targets.join(', ')}` : ''}
                            {targets.length > 0 && working.length > 0 ? ' · ' : ''}
                            {working.length > 0 ? `Working on: ${working.join(', ')}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </CollapsibleSection>
  )
}
