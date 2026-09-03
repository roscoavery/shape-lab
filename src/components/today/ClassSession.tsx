import { useEffect, useMemo, useState } from 'react'
import type { Athlete } from '../../types'
import { isCoachProfile, profileRole } from '../../lib/profileRole'
import {
  WEEKDAYS,
  attendeeLabel,
  classLabel,
  endClassMeeting,
  getActiveMeeting,
  getMeeting,
  loadMeetings,
  hydrateCoachClasses,
  loadOfferings,
  markClassAttendance,
  removeClassAttendance,
  removeOffering,
  resolveAttendeeAthletes,
  rosterAthletes,
  classCoachesLabel,
  offeringCoachIds,
  saveOffering,
  setOfferingCoaches,
  setOfferingExtras,
  setOfferingRoster,
  startClassMeeting,
  subscribeCoachClasses,
  toggleOfferingRoster,
  type ClassMeeting,
  type CoachClassOffering,
  type Weekday,
} from '../../lib/coachClasses'
import { splitPersonName } from '../../lib/classStation'
import { AssignClassHomework } from './AssignClassHomework'
import { EndClassPrompt } from './EndClassPrompt'
import { AthleteName } from '../AthleteAvatar'
import { ClassStopwatch } from './ClassStopwatch'
import { ClassAthleteDesk } from './ClassAthleteDesk'
import { ChalkboardPanel } from './ChalkboardPanel'
import { ClassExtraPicker } from './ClassExtraPicker'
import type { ClassExtraExercise } from '../../types'

type Props = {
  coach: Athlete
  athletes: Athlete[]
  onOpenStation: () => void
  onOpenShapeTest: () => void
  onClose: () => void
  onAthletesChange: (next: Athlete[]) => void
  onViewProfile?: (id: string) => void
}

type Screen = 'pick' | 'live' | 'assign' | 'schedule'

export function ClassSession({
  coach,
  athletes,
  onOpenStation,
  onOpenShapeTest,
  onClose,
  onAthletesChange,
  onViewProfile,
}: Props) {
  const [offerings, setOfferings] = useState<CoachClassOffering[]>(() => loadOfferings())
  const [screen, setScreen] = useState<Screen>('pick')
  const [ended, setEnded] = useState<ClassMeeting | null>(null)
  const [endAsk, setEndAsk] = useState(false)
  const [tick, setTick] = useState(0)

  const refresh = () => {
    setOfferings(loadOfferings())
    setTick((n) => n + 1)
  }

  useEffect(() => subscribeCoachClasses(refresh), [])
  useEffect(() => {
    void hydrateCoachClasses().then(refresh)
  }, [])

  const live = getActiveMeeting()
  const recent = loadMeetings().filter((m) => m.endedAt).slice(0, 4)
  void tick

  useEffect(() => {
    if (live) setScreen('live')
  }, [live?.id])

  const offeringFor = (id: string) => offerings.find((o) => o.id === id)

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            {live ? 'Class is running' : screen === 'assign' ? 'Class ended' : 'Today · Class'}
          </p>
          <p className="text-sm text-white/60">
            {live
              ? classLabel(offeringFor(live.offeringId) ?? { name: 'Class', weekday: 'Monday', time: '' })
              : screen === 'assign'
                ? 'Homework for who was here'
                : 'Which class are you running?'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
        >
          {live ? 'Keep class running' : 'Close'}
        </button>
      </header>

      {live && (
        <div className="mx-4 mb-2 rounded-xl border border-[var(--accent)]/50 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          Live now · {classLabel(offeringFor(live.offeringId) ?? { name: 'Class', weekday: 'Monday', time: '' })}
          . This hour stays open until you tap End class.
        </div>
      )}

      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col overflow-y-auto px-4 pb-10">
        {screen === 'schedule' && (
          <ScheduleEditor
            coachId={coach.id}
            offerings={offerings}
            athletes={athletes}
            onBack={() => {
              refresh()
              setScreen('pick')
            }}
            onChanged={refresh}
          />
        )}

        {screen === 'pick' && !live && (
          <div className="flex flex-col gap-4 pt-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Start a class</h2>
              <p className="mt-2 text-sm text-white/65">
                Pick the class you are on the floor for. This list is the
                gym’s saved classes — the same on phone, iPad, and laptop.
                Ending class asks whether to write Class nights — opening
                Start and End alone does not log anyone.
              </p>
            </div>
            {offerings.length === 0 ? (
              <QuickAddClass coachId={coach.id} athletes={athletes} onSaved={() => refresh()} />
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
                      {classCoachesLabel(o, athletes)
                        ? ` · ${classCoachesLabel(o, athletes)}`
                        : ''}
                      {o.rosterIds.length
                        ? ` · ${o.rosterIds.length} on roster`
                        : ' · add a roster'}
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
              {offerings.length ? 'Edit classes and rosters' : 'Add a class I teach'}
            </button>
            {recent.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  Ended recently
                </p>
                <ul className="mt-2 space-y-1 text-sm text-white/65">
                  {recent.map((m) => (
                    <li key={m.id}>
                      {classLabel(
                        offeringFor(m.offeringId) ?? { name: 'Class', weekday: 'Monday', time: '' },
                      )}{' '}
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
            meeting={getMeeting(live.id) ?? live}
            offering={offeringFor(live.offeringId)}
            athletes={athletes}
            coach={coach}
            onStation={onOpenStation}
            onShapeTest={onOpenShapeTest}
            onChanged={refresh}
            onAthletesChange={onAthletesChange}
            onViewProfile={onViewProfile}
            onAskEnd={() => setEndAsk(true)}
          />
        )}

        {endAsk && live && (
          <EndClassPrompt
            count={live.attendees.length}
            onLog={() => {
              const done = endClassMeeting(live.id, { logAttendance: true })
              setEndAsk(false)
              setEnded(done)
              setScreen('assign')
            }}
            onSkip={() => {
              const done = endClassMeeting(live.id, { logAttendance: false })
              setEndAsk(false)
              setEnded(done)
              setScreen('assign')
            }}
            onStay={() => setEndAsk(false)}
          />
        )}

        {screen === 'assign' && ended && (
          <AssignClassHomework
            meeting={ended}
            offering={offeringFor(ended.offeringId)}
            athletes={athletes}
            coach={coach}
            onDone={onClose}
            onAthletesChange={onAthletesChange}
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
  coach,
  onStation,
  onShapeTest,
  onChanged,
  onAthletesChange,
  onViewProfile,
  onAskEnd,
}: {
  meeting: ClassMeeting
  offering?: CoachClassOffering
  athletes: Athlete[]
  coach: Athlete
  onStation: () => void
  onShapeTest: () => void
  onChanged: () => void
  onAthletesChange: (next: Athlete[]) => void
  onViewProfile?: (id: string) => void
  onAskEnd: () => void
}) {
  const [pickId, setPickId] = useState('')
  const pool = useMemo(() => {
    const roster = rosterAthletes(offering, athletes)
    if (roster.length > 0) return roster
    return athletes.filter((a) => profileRole(a) === 'athlete' || !a.role)
  }, [athletes, offering])
  const present = resolveAttendeeAthletes(meeting, athletes)
  const extras = athletes.filter(
    (a) =>
      (profileRole(a) === 'athlete' || !a.role) &&
      !present.some((p) => p.id === a.id) &&
      !pool.some((p) => p.id === a.id),
  )

  return (
    <div className="flex flex-col gap-4 pt-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Running
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          {offering ? classLabel(offering) : 'Class'}
        </h2>
        <p className="mt-2 text-sm text-white/65">
          {meeting.attendees.length} marked here tonight. This list is for the
          hour and homework — Class nights only write when you log at End class.
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
          <option value="">Add someone who is here…</option>
          {[...pool, ...extras]
            .filter((a) => !present.some((p) => p.id === a.id))
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {offering?.rosterIds.includes(a.id) ? '' : ' · not on roster'}
              </option>
            ))}
        </select>
        <button
          type="button"
          disabled={!pickId}
          onClick={() => {
            const a = athletes.find((row) => row.id === pickId)
            if (!a) return
            const parts = splitPersonName(a.name)
            markClassAttendance({
              meetingId: meeting.id,
              athleteId: a.id,
              firstName: a.firstName || parts.firstName,
              lastName: a.lastName || parts.lastName,
              source: offering?.rosterIds.includes(a.id) ? 'roster' : 'manual',
            })
            if (offering && !offering.rosterIds.includes(a.id)) {
              toggleOfferingRoster(offering.id, a.id)
            }
            setPickId('')
            onChanged()
          }}
          className="rounded-xl bg-white/10 px-3 text-sm font-semibold disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {offering &&
        offering.rosterIds.some((id) => !present.some((p) => p.id === id)) && (
          <button
            type="button"
            onClick={() => {
              for (const id of offering.rosterIds) {
                if (present.some((p) => p.id === id)) continue
                const a = athletes.find((row) => row.id === id)
                if (!a) continue
                const parts = splitPersonName(a.name)
                markClassAttendance({
                  meetingId: meeting.id,
                  athleteId: a.id,
                  firstName: a.firstName || parts.firstName,
                  lastName: a.lastName || parts.lastName,
                  source: 'roster',
                  logged: false,
                })
              }
              onChanged()
            }}
            className="self-start text-xs font-semibold text-[var(--accent)] underline"
          >
            Add everyone on the roster
          </button>
        )}

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
          Here tonight
        </p>
        {meeting.attendees.length === 0 ? (
          <p className="mt-2 text-sm text-white/55">Nobody on this class list yet.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {meeting.attendees.map((row, i) => (
              <li
                key={`${row.athleteId ?? row.firstName}-${i}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  {row.athleteId ? (
                    <AthleteName
                      athlete={athletes.find((a) => a.id === row.athleteId) ?? {
                        name: attendeeLabel(row, athletes),
                      }}
                    />
                  ) : (
                    <span className="font-semibold">{attendeeLabel(row, athletes)}</span>
                  )}
                  <span className="ml-1 shrink-0 text-xs text-white/45">
                    {row.athleteId ? 'Profile' : 'Name only'}
                  </span>
                </span>
                <span className="flex shrink-0 gap-2">
                  {row.athleteId && onViewProfile && (
                    <button
                      type="button"
                      className="text-xs text-[var(--accent)] underline"
                      onClick={() => onViewProfile(row.athleteId!)}
                    >
                      View
                    </button>
                  )}
                  {row.athleteId && (
                    <button
                      type="button"
                      className="text-xs text-[var(--bad)] underline"
                      onClick={() => {
                        removeClassAttendance(meeting.id, row.athleteId!)
                        onChanged()
                      }}
                    >
                      Remove
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClassAthleteDesk
        athletes={athletes}
        present={present}
        coach={coach}
        className={offering ? classLabel(offering) : 'Class'}
        meetingId={meeting.id}
        onAthletesChange={onAthletesChange}
      />

      <ChalkboardPanel viewer={coach} offeringId={offering?.id} />

      <ClassStopwatch
        athletes={athletes}
        signedIn={coach}
        coach
      />

      <button
        type="button"
        onClick={onAskEnd}
        className="mt-2 h-14 rounded-2xl border-2 border-[var(--bad)] bg-[#2a1518] text-lg font-bold text-[var(--bad)]"
      >
        End class · assign homework
      </button>
    </div>
  )
}

function QuickAddClass({
  coachId,
  athletes,
  onSaved,
}: {
  coachId: string
  athletes: Athlete[]
  onSaved: () => void
}) {
  const [name, setName] = useState('Connections')
  const [weekday, setWeekday] = useState<Weekday>('Monday')
  const [time, setTime] = useState('5pm')
  const kids = athletes.filter((a) => profileRole(a) === 'athlete' || !a.role)
  const coaches = athletes.filter((a) => isCoachProfile(a))
  const [roster, setRoster] = useState<string[]>([])
  const [coachIds, setCoachIds] = useState<string[]>([coachId])
  const [extras, setExtras] = useState<ClassExtraExercise[]>([])
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-sm text-white/70">
        Name the class, then tap who is usually in it. Tonight you only pick from that list.
      </p>
      <input
        className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
        placeholder="Class type — Connections, Elevate, Reps w/ Logan"
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
      <RosterPicker
        label="Coaches on this class"
        athletes={coaches}
        selected={coachIds}
        onChange={setCoachIds}
        onText="Coaching"
        offText="Add"
      />
      <RosterPicker athletes={kids} selected={roster} onChange={setRoster} />
      <ClassExtraPicker extras={extras} onChange={setExtras} />
      <button
        type="button"
        disabled={!name.trim()}
        onClick={() => {
          saveOffering({
            coachId,
            coachIds: coachIds.length ? coachIds : [coachId],
            name: name.trim(),
            weekday,
            time: time.trim() || '5pm',
            rosterIds: roster,
            extraExercises: extras,
          })
          onSaved()
        }}
        className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
      >
        Save this class
      </button>
    </div>
  )
}

function RosterPicker({
  athletes,
  selected,
  onChange,
  label = 'Class roster',
  onText = 'On roster',
  offText = 'Add',
}: {
  athletes: Athlete[]
  selected: string[]
  onChange: (next: string[]) => void
  label?: string
  onText?: string
  offText?: string
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </p>
      {athletes.length === 0 ? (
        <p className="mt-1 text-sm text-white/55">No profiles yet.</p>
      ) : (
        <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
          {athletes.map((a) => {
            const on = selected.includes(a.id)
            return (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() =>
                    onChange(on ? selected.filter((id) => id !== a.id) : [...selected, a.id])
                  }
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                    on ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-black/30 text-white/80'
                  }`}
                >
                  <AthleteName athlete={a} />
                  <span className="text-xs">{on ? onText : offText}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function ScheduleEditor({
  coachId,
  offerings,
  athletes,
  onBack,
  onChanged,
}: {
  coachId: string
  offerings: CoachClassOffering[]
  athletes: Athlete[]
  onBack: () => void
  onChanged: () => void
}) {
  const [name, setName] = useState('')
  const [weekday, setWeekday] = useState<Weekday>('Monday')
  const [time, setTime] = useState('5pm')
  const [editId, setEditId] = useState<string | null>(null)
  const kids = athletes.filter((a) => profileRole(a) === 'athlete' || !a.role)
  const coaches = athletes.filter((a) => isCoachProfile(a))
  const editing = offerings.find((o) => o.id === editId) ?? null

  return (
    <div className="flex flex-col gap-4 pt-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Classes I teach</h2>
        <p className="mt-2 text-sm text-white/65">
          Every add or edit saves to the gym link and shows on every
          device after that — phone, iPad, and laptop. Name the class
          type — Connections, Elevate, Reps w/ Logan, or your own — and
          the time you teach it. Add a roster so Start class only shows
          who is usually in that hour.
        </p>
      </div>
      <input
        className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
        placeholder="Class type — Connections, Elevate, Reps w/ Logan"
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
          onChanged()
        }}
        className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
      >
        Save class
      </button>
      <ul className="space-y-3">
        {offerings.map((o) => (
          <li key={o.id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{classLabel(o)}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-xs underline"
                  onClick={() => setEditId(editId === o.id ? null : o.id)}
                >
                  {editId === o.id ? 'Done' : 'Edit'}
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--bad)] underline"
                  onClick={() => {
                    removeOffering(o.id)
                    onChanged()
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {classCoachesLabel(o, athletes)
                ? `Coaches: ${classCoachesLabel(o, athletes)} · `
                : ''}
              {o.rosterIds.length} athlete{o.rosterIds.length === 1 ? '' : 's'} on this class
              {o.extraExercises?.length
                ? ` · also ${o.extraExercises.map((ex) => ex.label).join(', ')}`
                : ''}
            </p>
            {editing?.id === o.id && (
              <div className="mt-2 flex flex-col gap-3">
                <RosterPicker
                  label="Coaches on this class"
                  athletes={coaches}
                  selected={offeringCoachIds(o)}
                  onChange={(next) => {
                    setOfferingCoaches(o.id, next.length ? next : [coachId])
                    onChanged()
                  }}
                  onText="Coaching"
                  offText="Add"
                />
                <RosterPicker
                  athletes={kids}
                  selected={o.rosterIds}
                  onChange={(next) => {
                    setOfferingRoster(o.id, next)
                    onChanged()
                  }}
                />
                <ClassExtraPicker
                  extras={o.extraExercises ?? []}
                  onChange={(next) => {
                    setOfferingExtras(o.id, next)
                    onChanged()
                  }}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      <button type="button" onClick={onBack} className="self-start text-sm text-white/50 underline">
        Back to start class
      </button>
    </div>
  )
}
