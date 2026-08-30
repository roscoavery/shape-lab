import { useState } from 'react'
import { formatSeconds } from '../../hooks/useHoldTimer'
import { addLessonNote } from '../../lib/lessonStore'
import type { Athlete, LessonSession } from '../../types'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import { AssignHomeworkBar } from './AssignHomeworkBar'
import { LessonNoteBar } from './LessonNoteBar'
import { groupLessonWork } from './SkillPicker'

type Props = {
  sessions: LessonSession[]
  athletes: Athlete[]
  coaches?: Athlete[]
  canEdit: boolean
  title?: string
  emptyText?: string
  onChanged?: () => void
}

export function LessonReviewList({
  sessions,
  athletes,
  coaches,
  canEdit,
  title = 'Lesson review',
  emptyText = 'No ended lessons yet.',
  onChanged,
}: Props) {
  const ended = sessions.filter((s) => s.endedAt)
  const [openId, setOpenId] = useState<string | null>(ended[0]?.id ?? null)

  if (ended.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">{emptyText}</p>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Notes, holds, and videos from each lesson. Open one to add more notes
        {canEdit ? ' or assign homework' : ''}.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {ended.map((s) => {
          const athlete = athletes.find((a) => a.id === s.athleteId)
          const coach = athletes.find((a) => a.id === s.coachId)
          const open = openId === s.id
          const groups = groupLessonWork(s)
          return (
            <li key={s.id} className="rounded-lg border border-[var(--panel-border)] bg-[#121820]">
              <button
                type="button"
                className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left"
                onClick={() => setOpenId(open ? null : s.id)}
              >
                <div>
                  <p className="text-sm font-semibold">
                    {athlete?.name ?? 'Athlete'}
                    <span className="font-normal text-[var(--muted)]">
                      {' '}
                      with {coach?.name ?? 'coach'}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {new Date(s.endedAt ?? s.startedAt).toLocaleString()} · {s.notes.length} notes ·{' '}
                    {s.holds.length} holds
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">{open ? 'Hide' : 'Review'}</span>
              </button>
              {open && (
                <div className="flex flex-col gap-3 border-t border-[var(--panel-border)] px-3 py-3">
                  {groups.length === 0 ? (
                    <p className="text-sm text-[var(--muted)]">Nothing was filed on this lesson.</p>
                  ) : (
                    groups.map((g) => (
                      <div key={g.key} className="rounded-md bg-[#0d1218] px-2 py-2">
                        <p className="text-[11px] font-bold">{g.label}</p>
                        {g.holds.map((h) => (
                          <p key={h.id} className="text-sm text-[var(--muted)]">
                            Hold {formatSeconds(h.totalHoldSeconds)}
                            {h.method === 'camera'
                              ? ` · ${formatSeconds(h.properHoldSeconds)} proper`
                              : ''}
                          </p>
                        ))}
                        {g.notes.map((n) => (
                          <p key={n.id} className="mt-0.5 text-sm">
                            {n.text}
                          </p>
                        ))}
                      </div>
                    ))
                  )}
                  <VideoLibraryPanel
                    athleteId={s.athleteId}
                    athleteName={athlete?.name ?? null}
                    folder="lesson"
                    lessonId={s.id}
                    coachId={s.coachId}
                    coachName={
                      athletes.find((a) => a.id === s.coachId)?.name ??
                      coaches?.find((a) => a.id === s.coachId)?.name ??
                      null
                    }
                    canSaveReference={canEdit}
                  />
                  {canEdit && (
                    <>
                      <LessonNoteBar
                        placeholder="Add something they should remember"
                        coachId={s.coachId}
                        onAdd={(text, topic) => {
                          addLessonNote(s.id, text, 'general', topic)
                          onChanged?.()
                        }}
                      />
                      <AssignHomeworkBar
                        athleteId={s.athleteId}
                        defaultNotes={s.notes[0]?.text}
                        defaultShapeId={
                          s.holds.find((h) => !h.shapeId.startsWith('custom:'))?.shapeId
                        }
                        defaultTyped={
                          s.holds.find((h) => h.shapeId.startsWith('custom:'))?.shapeName
                        }
                      />
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
