import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { profileRole } from '../../lib/profileRole'
import {
  WEEKDAYS,
  attendeeLabel,
  classLabel,
  endClassMeeting,
  getActiveMeeting,
  loadMeetings,
  loadOfferings,
  markClassAttendance,
  removeOffering,
  resolveAttendeeAthletes,
  saveOffering,
  startClassMeeting,
  subscribeCoachClasses,
  type ClassMeeting,
  type CoachClassOffering,
  type Weekday,
} from '../../lib/coachClasses'
import { splitPersonName } from '../../lib/classStation'
import { AssignClassHomework } from './AssignClassHomework'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onOpenStation: () => void
  onOpenShapeTest: () => void
  onClose: () => void
}

type Screen = 'pick' | 'live' | 'assign' | 'schedule'

export function ClassSession({ coach, athletes, onOpenStation, onOpenShapeTest, onClose }: Props) {
  const [offerings, setOfferings] = useState<CoachClassOffering[]>(() => loadOfferings(coach.id))
  const [screen, setScreen] = useState<Screen>('pick')
  const [ended, setEnded] = useState<ClassMeeting | null>(null)

  const refresh = () => {
    setOfferings(loadOfferings(coach.id))
  }

  useEffect(() => subscribeCoachClasses(refresh), [coach.id])

  const live = getActiveMeeting(coach.id)
  const recent = loadMeetings(coach.id).filter((m) => m.endedAt).slice(0, 4)

  useEffect(() => {
    if (live) setScreen('live')
  }, [live?.id])

  const offeringFor = (id: string) => offerings.find((o) => o.id === id)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Today · Class
          </p>
          <p className="text-sm text-white/60">
            {live
              ? classLabel(offeringFor(live.offeringId) ?? { ...offerings[0], name: 'Class', weekday: 'Monday', time: '' } as CoachClassOffering)
              : 'Which class are you running?'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          Close
        </button>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-y-auto px-4 pb-10">
        {screen === 'schedule' && (
          <ScheduleEditor
            coachId={coach.id}
            offerings={offerings}
            onBack={() => {
              refresh()
              setScreen('pick')
            }}
            onSaved={() => {
              refresh()
              setScreen('pick')
            }}
          />
        )}

        {screen === 'pick' && !live && (
          <div className="flex flex-col gap-4 pt-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Start a class</h2>
              <p className="mt-2 text-sm text-white/65">
                Pick the class you are on the floor for. Athletes who take the
                shape test or get a profile during this hour land on the
                attendance list so you can assign homework to everyone — or
                just a few — when you wrap.
              </p>
            </div>
            {offerings.length === 0 ? (
              <QuickAddClass
                coachId={coach.id}
                onSaved={() => refresh()}
              />
            ) : (
              <div className="flex flex-col gap-2">
                {offerings.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => {
                      startClassMeeting(o)
                      setScreen('live')
                    }}
                    className="rounded-2xl bg-gradient-to-br from-[#5cf0c8] via-[#2dd4a8] to-[#147a62] px-4 py-4 text-left text-[#06281f]"
                  >
                    <span className="block text-xl font-bold">{o.name}</span>
                    <span className="text-sm font-medium opacity-80">
                      {o.weekday} {o.time}
                    </span>
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setScreen('schedule')}
              className="rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold"
            >
              {offerings.length ? 'Edit classes I teach' : 'Add a class I teach'}
            </button>
            {recent.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  Recent
                </p>
                <ul className="mt-2 space-y-1 text-sm text-white/65">
                  {recent.map((m) => (
                    <li key={m.id}>
                      {classLabel(offeringFor(m.offeringId) ?? ({ name: 'Class', weekday: 'Monday', time: '' } as CoachClassOffering))}{' '}
                      · {m.attendees.length} athlete{m.attendees.length === 1 ? '' : 's'}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {screen === 'live' && live && (
          <LiveClass
            meeting={live}
            offering={offeringFor(live.offeringId)}
            athletes={athletes}
            onStation={onOpenStation}
            onShapeTest={onOpenShapeTest}
            onAdd={markClassAttendance}
            onEnd={() => {
              const done = endClassMeeting(live.id)
              setEnded(done)
              setScreen('assign')
            }}
          />
        )}

        {screen === 'assign' && ended && (
          <AssignClassHomework
            meeting={ended}
            offering={offeringFor(ended.offeringId)}
            athletes={athletes}
            coach={coach}
            onDone={onClose}
          />
        )}
      </div>
    </div>
  )
}

function LiveClass({
  meeting,
  offering,
  athletes,
  onStation,
  onShapeTest,
  onAdd,
  onEnd,
}: {
  meeting: ClassMeeting
  offering?: CoachClassOffering
  athletes: Athlete[]
  onStation: () => void
  onShapeTest: () => void
  onAdd: typeof markClassAttendance
  onEnd: () => void
}) {
  const [pickId, setPickId] = useState('')
  const roster = useMemo(
    () => athletes.filter((a) => profileRole(a) === 'athlete' || !a.role),
    [athletes],
  )
  const present = resolveAttendeeAthletes(meeting, athletes)

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Live
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {offering ? classLabel(offering) : 'Class'}
        </h2>
        <p className="mt-2 text-sm text-white/65">
          {meeting.attendees.length} here so far. Shape-test names land
          automatically. You can also tap a profile in.
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onStation}
          className="rounded-2xl bg-[var(--accent)] px-4 py-4 text-left font-bold text-[#06281f]"
        >
          Class station
          <span className="mt-1 block text-sm font-medium opacity-80">
            New name, parent phone, test
          </span>
        </button>
        <button
          type="button"
          onClick={onShapeTest}
          className="rounded-2xl bg-white/10 px-4 py-4 text-left font-bold"
        >
          Shape test
          <span className="mt-1 block text-sm font-medium text-white/65">
            Ask who is taking it
          </span>
        </button>
      </div>

      <div className="flex gap-2">
        <select
          className="h-12 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-3"
          value={pickId}
          onChange={(e) => setPickId(e.target.value)}
        >
          <option value="">Add a profile who is here…</option>
          {roster
            .filter((a) => !present.some((p) => p.id === a.id))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={!pickId}
          onClick={() => {
            const a = roster.find((row) => row.id === pickId)
            if (!a) return
            const parts = splitPersonName(a.name)
            onAdd({
              meetingId: meeting.id,
              athleteId: a.id,
              firstName: a.firstName || parts.firstName,
              lastName: a.lastName || parts.lastName,
              source: 'manual',
            })
            setPickId('')
          }}
          className="rounded-xl bg-white/10 px-3 text-sm font-semibold disabled:opacity-40"
        >
          Add
        </button>
      </div>

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Here today
        </p>
        {meeting.attendees.length === 0 ? (
          <p className="mt-2 text-sm text-white/55">Nobody checked in yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {meeting.attendees.map((row, i) => (
              <li
                key={`${row.athleteId ?? row.firstName}-${i}`}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className="font-semibold">{attendeeLabel(row, athletes)}</span>
                <span className="ml-2 text-xs text-white/45">
                  {row.athleteId ? 'Profile' : 'Name only'} ·{' '}
                  {row.source === 'shape_test' ? 'shape test' : row.source}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={onEnd}
        className="mt-2 h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
      >
        End class · assign homework
      </button>
    </div>
  )
}

function QuickAddClass({
  coachId,
  onSaved,
}: {
  coachId: string
  onSaved: () => void
}) {
  const [name, setName] = useState('Connections')
  const [weekday, setWeekday] = useState<Weekday>('Monday')
  const [time, setTime] = useState('5pm')
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/70">
        Name the class you are on the floor for. Example: Connections, Monday, 5pm.
      </p>
      <input
        className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
        placeholder="Class name — Connections"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3"
          value={weekday}
          onChange={(e) => setWeekday(e.target.value as Weekday)}
        >
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3"
          placeholder="5pm"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => {
          saveOffering({ coachId, name: name.trim(), weekday, time: time.trim() || '5pm' })
          onSaved()
        }}
        className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
      >
        Save and show this class
      </button>
    </div>
  )
}

function ScheduleEditor({
  coachId,
  offerings,
  onBack,
  onSaved,
}: {
  coachId: string
  offerings: CoachClassOffering[]
  onBack: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [weekday, setWeekday] = useState<Weekday>('Monday')
  const [time, setTime] = useState('5pm')

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Classes I teach</h2>
        <p className="mt-2 text-sm text-white/65">
          Name, day, and time. Today will show them as Connections (Monday 5pm).
        </p>
      </div>
      <input
        className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
        placeholder="Class name — Connections"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3"
          value={weekday}
          onChange={(e) => setWeekday(e.target.value as Weekday)}
        >
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
        <input
          className="h-12 rounded-xl border border-white/10 bg-black/30 px-3"
          placeholder="5pm"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => {
          saveOffering({ coachId, name: name.trim(), weekday, time: time.trim() || '5pm' })
          setName('')
          onSaved()
        }}
        className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
      >
        Save class
      </button>
      <ul className="space-y-2">
        {offerings.map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <span className="font-semibold">{classLabel(o)}</span>
            <button
              type="button"
              className="text-xs text-[var(--bad)] underline"
              onClick={() => removeOffering(o.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBack} className="self-start text-sm text-white/50 underline">
        Back to start class
      </button>
    </div>
  )
}
