import { useState } from 'react'
import type { Athlete, HomeworkItem, HomeworkLog } from '../../types'
import { addHomeworkLog, createId, ensureAutoHomework, loadAllHomework } from '../../lib/storage'
import { homeworkTitle } from '../../lib/homeworkLabel'

function todayInputValue(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type Props = {
  athlete: Athlete
  items: HomeworkItem[]
  onLogged: (log: HomeworkLog) => void
  coach?: Athlete | null
}

export function PastHoldLogForm({ athlete, items, onLogged, coach }: Props) {
  const [open, setOpen] = useState(false)
  const [homeworkId, setHomeworkId] = useState(items[0]?.id ?? '')
  const [date, setDate] = useState(todayInputValue())
  const [seconds, setSeconds] = useState('')
  const [reps, setReps] = useState('')
  const [inLesson, setInLesson] = useState(true)
  const [note, setNote] = useState<string | null>(null)

  const list = items.length ? items : ensureAutoHomework(athlete.id)

  const save = () => {
    const item =
      list.find((h) => h.id === homeworkId) ??
      loadAllHomework().find((h) => h.athleteId === athlete.id)
    if (!item) {
      setNote('Pick a drill to log.')
      return
    }
    const when = new Date(`${date}T12:00:00`)
    const hold = Number(seconds)
    const counted = Number(reps)
    if ((!Number.isFinite(hold) || hold <= 0) && (!Number.isFinite(counted) || counted <= 0)) {
      setNote('Enter a hold in seconds or a rep count.')
      return
    }
    const log: HomeworkLog = {
      id: createId('hwlog'),
      athleteId: athlete.id,
      homeworkId: item.id,
      shapeId: item.shapeId,
      date: Number.isNaN(when.getTime()) ? new Date().toISOString() : when.toISOString(),
      method: 'manual',
      totalHoldSeconds: Number.isFinite(hold) && hold > 0 ? Number(hold.toFixed(2)) : 0,
      score: 0,
      ...(Number.isFinite(counted) && counted > 0 ? { kind: 'reps' as const, reps: counted } : { kind: 'hold' as const }),
      loggedFrom: inLesson ? 'lesson' : undefined,
      sourceLabel: inLesson ? 'In a lesson' : 'Before Shape Lab',
      ...(coach ? { coachId: coach.id, coachName: coach.name } : {}),
    }
    addHomeworkLog(log)
    onLogged(log)
    setSeconds('')
    setReps('')
    setNote(`Saved ${homeworkTitle(item)} on ${date}${inLesson ? ' · in a lesson' : ''}.`)
    setOpen(false)
  }

  return (
    <div className="rounded-2xl border border-[var(--panel-border)] bg-[#121820] p-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Before this app
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--text)]">
          Log a hold from an older lesson
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {coach
            ? `Add a date and whether it was in a lesson for ${athlete.name.split(' ')[0]}.`
            : 'Holds and reps from lessons before Shape Lab. Pick the date and if it was in a lesson.'}
        </p>
      </button>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <label className="text-xs text-[var(--muted)]">
            Drill
            <select
              className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
              value={homeworkId}
              onChange={(e) => setHomeworkId(e.target.value)}
            >
              {list.map((item) => (
                <option key={item.id} value={item.id}>
                  {homeworkTitle(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[var(--muted)]">
            Date
            <input
              type="date"
              className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
              value={date}
              max={todayInputValue()}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-xs text-[var(--muted)]">
              Hold (seconds)
              <input
                type="number"
                min={0}
                className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
                value={seconds}
                onChange={(e) => setSeconds(e.target.value)}
              />
            </label>
            <label className="text-xs text-[var(--muted)]">
              Reps
              <input
                type="number"
                min={0}
                className="mt-1 h-11 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text)]">
            <input
              type="checkbox"
              checked={inLesson}
              onChange={(e) => setInLesson(e.target.checked)}
            />
            This was in a lesson
          </label>
          <button
            type="button"
            onClick={save}
            className="h-12 rounded-xl bg-[var(--accent)] text-sm font-bold text-[#06281f]"
          >
            Save that log
          </button>
        </div>
      )}
      {note && <p className="mt-2 text-xs text-[var(--accent)]">{note}</p>}
    </div>
  )
}
