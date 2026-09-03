import { useMemo, useState } from 'react'
import type { Athlete, HomeworkTrackMode } from '../../types'
import type { ClassMeeting, CoachClassOffering } from '../../lib/coachClasses'
import { attendeeLabel, classLabel, resolveAttendeeAthletes } from '../../lib/coachClasses'
import { allLibraryShapes } from '../../config/shapes'
import { addCoachExercise, loadCoachExercises, removeCoachExercise } from '../../lib/careStore'
import { assignHomeworkToAthletes, homeworkPickTitle } from '../../lib/homeworkAssign'
import { AddHomeworkForm, type HomeworkPick } from '../homework/AddHomeworkForm'
import { AthleteName } from '../AthleteAvatar'
import { ClassAthleteDesk } from './ClassAthleteDesk'

type Props = {
  meeting: ClassMeeting
  offering?: CoachClassOffering
  athletes: Athlete[]
  coach: Athlete
  onDone: () => void
  onAthletesChange: (next: Athlete[]) => void
}

export function AssignClassHomework({
  meeting,
  offering,
  athletes,
  coach,
  onDone,
  onAthletesChange,
}: Props) {
  const present = resolveAttendeeAthletes(meeting, athletes)
  const roster = (offering?.rosterIds ?? [])
    .map((id) => athletes.find((a) => a.id === id))
    .filter((a): a is Athlete => Boolean(a))
  const homeworkPool = useMemo(() => {
    const seen = new Set<string>()
    const out: Athlete[] = []
    for (const a of [...roster, ...present]) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      out.push(a)
    }
    return out
  }, [roster, present])
  const guests = meeting.attendees.filter(
    (row) => !row.athleteId && !present.some((a) => a.name.toLowerCase() === `${row.firstName} ${row.lastName}`.toLowerCase()),
  )
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set((offering?.rosterIds?.length ? offering.rosterIds : present.map((a) => a.id)).filter((id) => athletes.some((a) => a.id === id))),
  )
  const [notes, setNotes] = useState('')
  const [mode, setMode] = useState<HomeworkTrackMode | ''>('')
  const [target, setTarget] = useState('20')
  const [reps, setReps] = useState('')
  const [newExName, setNewExName] = useState('')
  const [newExMode, setNewExMode] = useState<HomeworkTrackMode>('reps')
  const [exercises, setExercises] = useState(() => loadCoachExercises(coach.id))
  const [flash, setFlash] = useState<string | null>(null)
  const libraryShapes = useMemo(
    () => allLibraryShapes().slice().sort((a, b) => a.name.localeCompare(b.name)),
    [],
  )

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const add = (pick: HomeworkPick) => {
    const ids = [...selected]
    if (ids.length === 0) {
      setFlash('Pick at least one athlete with a profile.')
      return
    }
    const result = assignHomeworkToAthletes(ids, {
      pick,
      source: 'coach',
      notes,
      mode,
      targetSeconds: Number(target) || undefined,
      targetReps: Number(reps) || undefined,
      coachExercises: exercises,
    })
    setFlash(
      `Assigned ${homeworkPickTitle(pick)} to ${result.added} athlete${result.added === 1 ? '' : 's'}${
        result.skipped ? ` · ${result.skipped} already had it` : ''
      }.`,
    )
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Class over
        </p>
        <h2 className="text-3xl font-bold tracking-tight">
          Homework{offering ? ` · ${classLabel(offering)}` : ''}
        </h2>
        <p className="mt-2 text-sm text-white/65">
          The class roster starts checked for homework — not roll. Core
          drills become coach-assigned on the card they already have. Do
          not assign back extensions or glute bridges here; those stay on
          the coach back-pain path. Candlestick, core, and study shapes
          are the stock picks. Athletes study the library and take the
          shape test at home.
        </p>
      </div>

      <ClassAthleteDesk
        athletes={athletes}
        present={present}
        coach={coach}
        className={offering ? classLabel(offering) : 'Class'}
        meetingId={meeting.id}
        onAthletesChange={onAthletesChange}
        title="Notes and wins after class"
        hint="Same desk as during class. Pick who it is about, then write."
      />

      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
            Who gets it
          </p>
          <button
            type="button"
            className="text-xs text-[var(--accent)] underline"
            onClick={() =>
              setSelected(
                selected.size === homeworkPool.length
                  ? new Set()
                  : new Set(homeworkPool.map((a) => a.id)),
              )
            }
          >
            {selected.size === homeworkPool.length ? 'Select none' : 'Select whole roster'}
          </button>
        </div>
        {homeworkPool.length === 0 ? (
          <p className="text-sm text-white/55">
            Nobody on the roster or roll has a profile yet. Add them under
            Edit classes, or they check in at the roll station.
          </p>
        ) : (
          <ul className="space-y-2">
            {homeworkPool.map((a) => (
              <li key={a.id}>
                <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(a.id)}
                    onChange={() => toggle(a.id)}
                  />
                  <AthleteName athlete={a} nameClassName="font-semibold" />
                </label>
              </li>
            ))}
          </ul>
        )}
        {guests.length > 0 && (
          <p className="mt-2 text-xs text-white/45">
            Name only — make a profile to assign homework:{' '}
            {guests.map((g) => attendeeLabel(g, athletes)).join(', ')}
          </p>
        )}
      </section>

      <div className="rounded-2xl border border-white/10 bg-[#0d1613] p-4">
        <AddHomeworkForm
          libraryShapes={libraryShapes}
          coachExercises={exercises}
          isCoach
          stockAudience="class"
          source="coach"
          onSource={() => {}}
          notes={notes}
          onNotes={setNotes}
          mode={mode}
          onMode={setMode}
          target={target}
          onTarget={setTarget}
          reps={reps}
          onReps={setReps}
          newExName={newExName}
          onNewExName={setNewExName}
          newExMode={newExMode}
          onNewExMode={setNewExMode}
          onSaveExercise={() => {
            if (!newExName.trim()) return
            addCoachExercise({ coachId: coach.id, name: newExName.trim(), trackMode: newExMode })
            setExercises(loadCoachExercises(coach.id))
            setNewExName('')
          }}
          onRemoveExercise={(id) => {
            removeCoachExercise(id)
            setExercises(loadCoachExercises(coach.id))
          }}
          onAdd={add}
        />
      </div>

      {flash && <p className="text-sm text-[var(--accent)]">{flash}</p>}

      <button
        type="button"
        onClick={onDone}
        className="h-14 rounded-2xl border border-white/15 text-base font-semibold"
      >
        Done
      </button>
    </div>
  )
}
