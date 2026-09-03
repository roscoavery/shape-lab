import { useState } from 'react'
import { TUMBLE_SMART, sameGym } from '../../config/gyms'
import type { GymScope } from '../../lib/gymScope'
import {
  createTrainingEvent,
  deleteTrainingEvent,
  type TrainingEvent,
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
  const [hostGym, setHostGym] = useState(viewerGym || TUMBLE_SMART)

  const activeEvent = scope.kind === 'event' ? events.find((e) => e.id === scope.eventId) : null

  const makeEvent = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const event = createTrainingEvent({
      name: trimmed,
      coachId,
      hostGym: hostGym.trim() || viewerGym,
      athleteIds: seedAthleteIds,
    })
    setName('')
    setMaking(false)
    onEventsChange()
    onCreated?.(event)
    onScope({ kind: 'event', eventId: event.id })
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        Who shows here
      </p>
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
        {gyms.map((gym) => (
          <button
            key={gym}
            type="button"
            className={chipClass(scope.kind === 'gym' && sameGym(scope.gym, gym))}
            onClick={() => onScope({ kind: 'gym', gym })}
          >
            {gym}
          </button>
        ))}
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            className={chipClass(scope.kind === 'event' && scope.eventId === event.id)}
            onClick={() => onScope({ kind: 'event', eventId: event.id })}
          >
            {event.name}
          </button>
        ))}
        <button
          type="button"
          className={chipClass(making)}
          onClick={() => setMaking((v) => !v)}
        >
          + Camp / clinic
        </button>
      </div>
      {scope.kind === 'desk' && (
        <p className="text-[11px] text-[var(--muted)]">
          {viewerGym} athletes, plus class and private-lesson names. Add a camp
          athlete here if they should show on this gym. Add someone from this
          list onto a camp without taking them off.
        </p>
      )}
      {scope.kind === 'all' && (
        <p className="text-[11px] text-[var(--muted)]">
          Whole network. Names from another gym are labeled so you can still
          open them for a camp or a travel day.
        </p>
      )}
      {scope.kind === 'gym' && (
        <p className="text-[11px] text-[var(--muted)]">
          Everyone whose home gym or class gym is {scope.gym}.
        </p>
      )}
      {activeEvent && (
        <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] px-3 py-2">
          <p className="text-sm font-semibold">{activeEvent.name}</p>
          <p className="text-[11px] text-[var(--muted)]">
            {activeEvent.hostGym ? `${activeEvent.hostGym} · ` : ''}
            {activeEvent.athleteIds.length}{' '}
            {activeEvent.athleteIds.length === 1 ? 'athlete' : 'athletes'}. Home
            gym stays put. Add them to this gym if they take class here.
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
            Delete this camp
          </button>
        </div>
      )}
      {making && (
        <div className="grid gap-2 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
          <p className="text-sm font-semibold">New camp or travel group</p>
          <p className="text-[11px] text-[var(--muted)]">
            Anyone already tapped for a lesson is added. Tumble Smart athletes
            can sit on this camp and still stay on this gym.
          </p>
          <input
            className="h-10 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            placeholder="Camp or clinic name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') makeEvent()
            }}
          />
          <input
            className="h-10 rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
            placeholder="Host gym"
            value={hostGym}
            onChange={(e) => setHostGym(e.target.value)}
          />
          <button
            type="button"
            disabled={!name.trim()}
            onClick={makeEvent}
            className="h-10 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[#06281f] disabled:opacity-40"
          >
            Create group
          </button>
        </div>
      )}
    </div>
  )
}
