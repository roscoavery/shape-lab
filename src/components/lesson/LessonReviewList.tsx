import { useState } from 'react'
import { addLessonNote } from '../../lib/lessonStore'
import type { Athlete, LessonSession } from '../../types'
import { CollapsibleSection } from '../CollapsibleSection'
import { HoldProperTimes } from '../HoldProperTimes'
import { VideoLibraryPanel } from '../VideoLibraryPanel'
import { AssignHomeworkBar } from './AssignHomeworkBar'
import { LessonNoteBar } from './LessonNoteBar'
import { groupLessonWork } from './SkillPicker'
import { AthleteName } from '../AthleteAvatar'
import { AthleteProfileCard } from '../AthleteProfileCard'
import { addCoachNotesToAthletes } from '../../lib/athleteNotes'
import { logClassSkillForAthlete } from '../../lib/classSessionLog'
import { publishTextPost } from '../../lib/feedPosts'

type Props = {
  sessions: LessonSession[]
  athletes: Athlete[]
  coaches?: Athlete[]
  viewer?: Athlete | null
  canEdit: boolean
  title?: string
  emptyText?: string
  onChanged?: () => void
  onAthletesChange?: (next: Athlete[]) => void
  onViewProfile?: (id: string) => void
}

export function LessonReviewList({
  sessions,
  athletes,
  coaches,
  viewer = null,
  canEdit,
  title = 'Lesson review',
  emptyText = 'No ended lessons yet.',
  onChanged,
  onAthletesChange,
  onViewProfile,
}: Props) {
  const ended = sessions.filter((s) => s.endedAt)
  const [openId, setOpenId] = useState<string | null>(null)

  if (ended.length === 0) {
    return (
      <CollapsibleSection title={title} hint="No ended lessons yet">
        <p className="text-sm text-[var(--muted)]">{emptyText}</p>
      </CollapsibleSection>
    )
  }

  return (
    <CollapsibleSection
      title={title}
      hint={`${ended.length} lesson${ended.length === 1 ? '' : 's'} · open one when you want the recap`}
    >
      <p className="text-sm text-[var(--muted)]">
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
                    <AthleteName
                      athlete={athlete ?? { name: 'Athlete' }}
                      nameClassName="font-semibold"
                    />
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
                <div className="flex flex-col gap-2 border-t border-[var(--panel-border)] px-3 py-3">
                  {athlete && (
                    <AthleteProfileCard
                      athlete={athlete}
                      viewer={viewer ?? coach ?? null}
                      variant="embed"
                      onAddNote={
                        canEdit && viewer && onAthletesChange
                          ? (text) => {
                              onAthletesChange(
                                addCoachNotesToAthletes(athletes, [athlete.id], {
                                  author: viewer,
                                  text,
                                  lessonId: s.id,
                                }),
                              )
                              addLessonNote(s.id, text, 'general')
                              onChanged?.()
                            }
                          : undefined
                      }
                      onAddWin={
                        canEdit && viewer
                          ? async (text, big) => {
                              logClassSkillForAthlete({ athleteId: athlete.id, text })
                              await publishTextPost({
                                authorId: viewer.id,
                                caption: `${athlete.name}: ${text}`,
                                taggedIds: [athlete.id],
                                channels: big ? ['wins', 'gym'] : ['wins'],
                              })
                              if (onAthletesChange) {
                                onAthletesChange(
                                  addCoachNotesToAthletes(athletes, [athlete.id], {
                                    author: viewer,
                                    text: `Win · ${text}`,
                                    lessonId: s.id,
                                    topicLabel: 'Win',
                                  }),
                                )
                              }
                              onChanged?.()
                            }
                          : undefined
                      }
                    />
                  )}
                  {athlete && onViewProfile && (
                    <button
                      type="button"
                      className="self-start text-xs font-semibold text-[var(--accent)] underline"
                      onClick={() => onViewProfile(athlete.id)}
                    >
                      Open full profile
                    </button>
                  )}
                  <CollapsibleSection
                    inset
                    title="Recap of this lesson"
                    hint={
                      groups.length === 0
                        ? 'Nothing was filed'
                        : `${groups.length} skill${groups.length === 1 ? '' : 's'}`
                    }
                  >
                    {groups.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">Nothing was filed on this lesson.</p>
                    ) : (
                      groups.map((g) => (
                        <div key={g.key} className="rounded-md bg-[#121820] px-2 py-2">
                          <p className="text-[11px] font-bold">{g.label}</p>
                          {g.holds.map((h) => (
                            <p key={h.id} className="text-sm">
                              <HoldProperTimes
                                total={h.totalHoldSeconds}
                                proper={h.method === 'camera' ? h.properHoldSeconds : null}
                              />
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
                  </CollapsibleSection>
                  <CollapsibleSection
                    inset
                    title="Video library"
                    hint="Clips saved on this lesson"
                  >
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
                      embedded
                    />
                  </CollapsibleSection>
                  {canEdit && (
                    <>
                      <CollapsibleSection inset title="Notes" hint="Add something they should remember">
                        <LessonNoteBar
                          placeholder="Add something they should remember"
                          coachId={s.coachId}
                          onAdd={(text, topic) => {
                            addLessonNote(s.id, text, 'general', topic)
                            if (viewer && onAthletesChange) {
                              onAthletesChange(
                                addCoachNotesToAthletes(athletes, [s.athleteId], {
                                  author: viewer,
                                  text,
                                  lessonId: s.id,
                                  topicLabel: topic.label,
                                }),
                              )
                            }
                            onChanged?.()
                          }}
                        />
                      </CollapsibleSection>
                      <CollapsibleSection
                        inset
                        title="Assign homework"
                        hint="They will see it under Practice → Homework"
                      >
                        <AssignHomeworkBar
                          hideHeading
                          athleteId={s.athleteId}
                          coachId={s.coachId}
                          defaultNotes={s.notes[0]?.text}
                          defaultShapeId={
                            s.holds.find((h) => !h.shapeId.startsWith('custom:'))?.shapeId
                          }
                          defaultTyped={
                            s.holds.find((h) => h.shapeId.startsWith('custom:'))?.shapeName
                          }
                        />
                      </CollapsibleSection>
                    </>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </CollapsibleSection>
  )
}
