import { useState } from 'react'
import type { Athlete, ClassExtraExercise } from '../../types'
import type { LessonClockContext } from '../../lib/sessionClockLog'
import { ClassStopwatch } from './ClassStopwatch'
import { ContestStopwatch } from './ContestStopwatch'
import { ClassRepCounter } from './ClassRepCounter'

type ClockView = 'clock' | 'contest' | 'reps'

/**
 * The session clock, shared by classes and lessons. Same three views
 * everywhere: the class clock (holds with scaled exercise options), the hold
 * contest, and the rep counter.
 *
 * Class sessions pass the meeting id and class name; the clock resolves the
 * present roster from the active meeting itself. Lesson sessions pass
 * `lesson` plus the lesson athletes as `present`, and everything logs as
 * lesson work.
 */
export function SessionClock({
  athletes,
  present,
  signedIn,
  coach,
  className,
  meetingId,
  lesson,
  extras,
  embedClock = false,
  onLessonActivity,
}: {
  /** Full athlete list (search pool for the clock). */
  athletes: Athlete[]
  /** Roster: present athletes for a class, lesson athletes for a lesson. */
  present: Athlete[]
  signedIn: Athlete | null
  coach?: boolean
  className?: string
  meetingId?: string
  /** Lesson context: the clock runs in lesson mode. */
  lesson?: LessonClockContext
  /** Class extras for lesson mode (lesson plan extras). */
  extras?: ClassExtraExercise[]
  /** Render the clock body only (a Today dock already supplies the title). */
  embedClock?: boolean
  /** Fired after lesson-mode logging so the host can refresh. */
  onLessonActivity?: () => void
}) {
  const [clockView, setClockView] = useState<ClockView>('clock')
  return (
    <div className="flex flex-col gap-2">
      <div className="flex rounded-full border border-white/10 bg-black/30 p-1">
        <button
          type="button"
          onClick={() => setClockView('clock')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${
            clockView === 'clock' ? 'bg-[var(--accent)] text-black' : 'text-white/60'
          }`}
        >
          ⏱ Class clock
        </button>
        <button
          type="button"
          onClick={() => setClockView('contest')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${
            clockView === 'contest' ? 'bg-amber-300 text-black' : 'text-white/60'
          }`}
        >
          🏆 Hold contest
        </button>
        <button
          type="button"
          onClick={() => setClockView('reps')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-bold ${
            clockView === 'reps' ? 'bg-emerald-300 text-black' : 'text-white/60'
          }`}
        >
          💪 Reps
        </button>
      </div>
      {clockView === 'clock' ? (
        <ClassStopwatch
          athletes={athletes}
          signedIn={signedIn}
          coach={coach}
          embed={embedClock}
          sessionPool={lesson ? present : undefined}
          lesson={lesson}
          extras={extras}
          onLessonActivity={onLessonActivity}
        />
      ) : clockView === 'contest' ? (
        <ContestStopwatch
          athletes={present}
          signedIn={signedIn}
          className={className}
          meetingId={meetingId}
          lesson={lesson}
          onLessonActivity={onLessonActivity}
        />
      ) : (
        <ClassRepCounter
          athletes={present}
          signedIn={signedIn}
          className={className}
          meetingId={meetingId}
          lesson={lesson}
          onLessonActivity={onLessonActivity}
        />
      )}
    </div>
  )
}
