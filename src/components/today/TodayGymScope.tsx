import { useState } from 'react'
import { TUMBLE_SMART, sameGym } from '../../config/gyms'
import type { GymScope } from '../../lib/gymScope'
import {
  TRAINING_EVENT_KINDS,
  createTrainingEvent,
  deleteTrainingEvent,
  eventKindLabel,
  type TrainingEvent,
  type TrainingEventKind,
} from '../../lib/trainingEvents'

type Props = {
  scope: GymScope
  onScope: (scope: GymScope) => void
  gyms: string[]
  events: TrainingEvent[]
  viewerGym: string
  coachId: string
  seedAthleteIds?: string[]
  onEventsChange: () => void
  onCreated?: (event: TrainingEvent) => void
}

function chipClass(on: boolean) {
  return `rounded-full px-3 py-1.5 text-xs font-semibold ${
    on ? 'bg-[var(--accent)] text-[#06281f]' : 'border border-[var(--panel-border)] bg-[#121820] text-[var(--text)]'
  }`
}

export function TodayGymScope({
  scope,
  onScope,
  gyms,
  events,
  viewerGym,
  coachId,
  seedAthleteIds = [],
  onEventsChange,
  onCreated,
}: Props) {
  const [making, setMaking] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<TrainingEventKind>('school')
  const [hostGym, setHostGym] = useState('')

  const activeEvent = scope.kind === 'event' ? events.find((e) => e.id === scope.eventId) : null
  const otherGyms = gyms.filter((gym) => !sameGym(gym, viewerGym) && !sameGym(gym, TUMBLE_SMART))

  const makeEvent = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const event = createTrainingEvent({
      name: trimmed,
      kind,
      coachId,
      hostGym: hostGym.trim() || trimmed,
      athleteIds: seedAthleteIds,
    })
    setName('')
    setHostGym('')
    setMaking(false)
    onEventsChange()
    onCreated?.(event)
    onScope({ kind: 'event', eventId: event.id })
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          className={chipClass(scope.kind === 'desk')}
          onClick={() => onScope({ kind: 'desk' })}
        >
          This gym
        </button>
        <button
          type="button"
          className={chipClass(scope.kind === 'all')}
          onClick={() => onScope({ kind: 'all' })}
        >
          Search all
        </button>
        {activeEvent && (
          <button
            type="button"
            className={chipClass(true)}
            onClick={() => onScope({ kind: 'event', eventId: activeEvent.id })}
          >
            {activeEvent.name}
          </button>
        )}
        <button
          type="button"
          className={chipClass(making)}
          onClick={() => setMaking((v) => !v)}
        >
          + Add group
        </button>
      </div>

      {otherGyms.length > 0 && (
        <details className="rounded-lg bg-[#0d1218] px-3 py-2">
          <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
            Other gyms ({otherGyms.length})
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {otherGyms.map((gym) => (
              <button
                key={gym}
                type="button"
                className={chipClass(scope.kind === 'gym' && sameGym(scope.gym, gym))}
                onClick={() => onScope({ kind: 'gym', gym })}
              >
                {gym}
              </button>
            ))}
          </div>
        </details>
      )}

      {events.length > 0 && (
        <details className="rounded-lg bg-[#0d1218] px-3 py-2" open={scope.kind === 'event'}>
          <summary className="cursor-pointer text-xs font-semibold text-[var(--muted)]">
            School / camp / clinic ({events.length})
          </summary>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted)]">
            These lists stay off the gym desk. Open one only when you are with that group.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {events.map((event) => (
              <button
                key={event.id}
                type="button"
                className={chipClass(scope.kind === 'event' && scope.eventId === event.id)}
                onClick={() => onScope({ kind: 'event', eventId: event.id })}
              >
                {eventKindLabel(event.kind)} · {event.name}
              </button>
            ))}
          </div>
        </details>
      )}

      {activeEvent && (
        <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2">
          <p className="text-sm font-semibold">
            {eventKindLabel(activeEvent.kind)} · {activeEvent.name}
          </p>
          <p className="text-[11px] text-[var(--muted)]">
            {activeEvent.athleteIds.length}{' '}
            {activeEvent.athleteIds.length === 1 ? 'athlete' : 'athletes'}. They
            do not show on This gym unless they also take class there.
          </p>
          <button
            type="button"
            className="mt-2 text-xs font-semibold text-[var(--bad)]"
            onClick={() => {
              deleteTrainingEvent(activeEvent.id)
              onEventsChange()
              onScope({ kind: 'desk' })
            }}
          >
            Delete this group
          </button>
        </div>
      )}

      {making && (
        <div className="grid gap-2 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
          <p className="text-sm font-semibold">New group</p>
          <p className="text-[11px] text-[var(--muted)]">
            School, camp, clinic, or other. Athletes you add stay on this list
            and off the main gym view.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TRAINING_EVENT_KINDS.map((row) => (
              <button
                key={row.id}
                type="button"
                className={chipClass(kind === row.id)}
                onClick={() => setKind(row.id)}
              >
                {row.label}
              </button>
            ))}
          </div>
          <input
            className="h-10 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            placeholder={
              kind === 'school' ? 'School name' : kind === 'camp' ? 'Camp name' : 'Group name'
            }
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') makeEvent()
            }}
          />
          <input
            className="h-10 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            placeholder="Place (optional)"
            value={hostGym}
            onChange={(e) => setHostGym(e.target.value)}
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={makeEvent}
            className="h-10 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[#06281f] disabled:opacity-40"
          >
            Create {kind}
          </button>
        </div>
      )}
    </div>
  )
}
