import { useState } from 'react'
import { addLessonNote, hideLessonRecap, unhideLessonRecap } from '../../lib/lessonStore'
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
import { coachShareLabel } from '../../lib/coachShare'

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

const DAY_MS = 24 * 60 * 60 * 1000

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
  const now = Date.now()
  const hidden = ended.filter((s) => s.hiddenAt)
  const showing = ended.filter((s) => !s.hiddenAt)
  const recent = showing.filter(
    (s) => now - Date.parse(s.endedAt ?? s.startedAt) < DAY_MS,
  )
  const older = showing.filter(
    (s) => now - Date.parse(s.endedAt ?? s.startedAt) >= DAY_MS,
  )

  if (ended.length === 0) {
    return (
      <CollapsibleSection title={title} hint="No ended lessons yet">
        <p className="text-sm text-[var(--muted)]">{emptyText}</p>
      </CollapsibleSection>
    )
  }

  const canHideSession = (s: LessonSession) =>
    canEdit || viewer?.id === s.athleteId || viewer?.id === s.coachId

  const renderList = (list: LessonSession[]) => (
    <ul className="mt-3 flex flex-col gap-3">
      {list.map((s) => {
        const athlete = athletes.find((a) => a.id === s.athleteId)
        const coach = athletes.find((a) => a.id === s.coachId)
        const open = openId === s.id
        const groups = groupLessonWork(s)
        const hideable = canHideSession(s)
        return (
          <li key={s.id} className="rounded-lg border border-[var(--panel-border)] bg-[#121820]">
            <div className="flex items-stretch">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-start justify-between gap-2 px-3 py-2 text-left"
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
                <span className="text-xs text-[var(--muted)]">{open ? 'Close' : 'Review'}</span>
              </button>
              {hideable && (
                <button
                  type="button"
                  onClick={() => {
                    if (s.hiddenAt) unhideLessonRecap(s.id)
                    else hideLessonRecap(s.id)
                    if (openId === s.id) setOpenId(null)
                    onChanged?.()
                  }}
                  className="shrink-0 px-3 text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--text)]"
                >
                  {s.hiddenAt ? 'Show again' : 'Remove'}
                </button>
              )}
            </div>
            {open && (
              <div className="flex flex-col gap-2 border-t border-[var(--panel-border)] px-3 py-3">
                {athlete && (
                  <AthleteProfileCard
                    athlete={athlete}
                    viewer={viewer ?? coach ?? null}
                    athletes={athletes}
                    variant="embed"
                    onAthleteChange={
                      onAthletesChange
                        ? (next) =>
                            onAthletesChange(athletes.map((a) => (a.id === next.id ? next : a)))
                        : undefined
                    }
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
                              authorId: athlete.id,
                              caption: text,
                              taggedIds: [athlete.id],
                              channels: big ? ['wins', 'gym'] : ['wins'],
                              sharedById: viewer.id,
                              sharedByName: coachShareLabel(viewer),
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
  )

  return (
    <CollapsibleSection
      title={title}
      hint={`${showing.length} showing · recaps fold after a day`}
    >
      <p className="text-sm text-[var(--muted)]">
        Recaps from the last day stay here. Older lessons stay in Older recaps — go back as far as
        you want. Remove hides a recap without deleting the notes.
        {canEdit ? ' Open one to add more notes or assign homework.' : ''}
      </p>
      {recent.length > 0 ? (
        renderList(recent)
      ) : (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No recaps from the last day. Older lessons are below.
        </p>
      )}
      {older.length > 0 && (
        <div className="mt-3">
          <CollapsibleSection
            inset
            title="Older recaps"
            hint={`${older.length} · as far back as you have`}
            defaultOpen={recent.length === 0}
          >
            {renderList(older)}
          </CollapsibleSection>
        </div>
      )}
      {hidden.length > 0 && (
        <div className="mt-3">
          <CollapsibleSection
            inset
            title="Removed recaps"
            hint={`${hidden.length} hidden · Show again brings them back`}
            defaultOpen={false}
          >
            {renderList(hidden)}
          </CollapsibleSection>
        </div>
      )}
    </CollapsibleSection>
  )
}
