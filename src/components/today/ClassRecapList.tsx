import { useEffect, useState } from 'react'
import type { Athlete, AthleteCoachNote } from '../../types'
import {
  addCoachNotesToAthletes,
  applyCoachNoteUpdate,
  canEditCoachNote,
  canWriteCoachNotes,
  groupNotesByAuthor,
  notesForMeeting,
  relabelMeetingNotes,
} from '../../lib/athleteNotes'
import {
  attendeeLabel,
  classLabel,
  deleteClassMeeting,
  getOffering,
  loadMeetings,
  loadOfferings,
  markClassAttendance,
  removeClassAttendance,
  resolveAttendeeAthletes,
  setMeetingOffering,
  subscribeCoachClasses,
  type ClassMeeting,
} from '../../lib/coachClasses'
import { copyClassWorkToAthlete, relabelClassMeetingLogs } from '../../lib/classSessionLog'
import { splitPersonName } from '../../lib/classStation'
import { formatQuizScore, quizKindLabel } from '../../lib/quizGrades'
import { CollapsibleSection } from '../CollapsibleSection'
import { AthleteName } from '../AthleteAvatar'

type Props = {
  athletes: Athlete[]
  viewer: Athlete | null
  classInSession: boolean
  onAthletesChange?: (next: Athlete[]) => void
  title?: string
}

export function ClassRecapList({
  athletes,
  viewer,
  classInSession,
  onAthletesChange,
  title = 'Class recaps',
}: Props) {
  const [, setTick] = useState(0)
  useEffect(() => subscribeCoachClasses(() => setTick((n) => n + 1)), [])
  const meetings = loadMeetings()
    .filter((m) => m.endedAt)
    .slice(0, 16)
  const coach = Boolean(viewer && canWriteCoachNotes(viewer))
  const canEdit = coach && !classInSession && Boolean(onAthletesChange)

  if (!coach) return null

  return (
    <CollapsibleSection
      title={title}
      hint={
        meetings.length
          ? `${meetings.length} ended class${meetings.length === 1 ? '' : 'es'}`
          : 'After you end a class, grades and notes land here'
      }
    >
      {meetings.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          When a class ends, each athlete’s shape-test grades and notes show
          here — grouped by who wrote them.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {meetings.map((meeting) => (
            <ClassRecapCard
              key={meeting.id}
              meeting={meeting}
              athletes={athletes}
              viewer={viewer}
              canEdit={canEdit}
              onAthletesChange={onAthletesChange}
            />
          ))}
        </ul>
      )}
    </CollapsibleSection>
  )
}

function ClassRecapCard({
  meeting,
  athletes,
  viewer,
  canEdit,
  onAthletesChange,
}: {
  meeting: ClassMeeting
  athletes: Athlete[]
  viewer: Athlete | null
  canEdit: boolean
  onAthletesChange?: (next: Athlete[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [askDelete, setAskDelete] = useState(false)
  const [addId, setAddId] = useState('')
  const [flash, setFlash] = useState<string | null>(null)
  const offering = getOffering(meeting.offeringId)
  const offerings = loadOfferings()
  const people = resolveAttendeeAthletes(meeting, athletes)
  const presentIds = new Set(people.map((p) => p.id))
  const addable = athletes
    .filter((a) => a.role !== 'parent' && !presentIds.has(a.id))
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
  const guests = meeting.attendees.filter((row) => !row.athleteId)
  const when = new Date(meeting.endedAt ?? meeting.startedAt).toLocaleString()
  const className = offering ? classLabel(offering) : undefined

  const addAthleteToRecap = (athleteId: string) => {
    const athlete = athletes.find((a) => a.id === athleteId)
    if (!athlete) return
    const parts = splitPersonName(athlete.name)
    markClassAttendance({
      athleteId: athlete.id,
      firstName: athlete.firstName || parts.firstName,
      lastName: athlete.lastName || parts.lastName,
      source: 'manual',
      meetingId: meeting.id,
      logged: true,
    })
    const copied = copyClassWorkToAthlete({
      meetingId: meeting.id,
      athleteId: athlete.id,
      className,
      at: meeting.endedAt ?? meeting.startedAt,
    })
    setAddId('')
    setFlash(
      copied
        ? `Logged ${athlete.name.split(' ')[0]} for this class and copied ${copied} hold${copied === 1 ? '' : 's'} / skill${copied === 1 ? '' : 's'}.`
        : `Logged ${athlete.name.split(' ')[0]} for this class night.`,
    )
  }

  return (
    <li className="rounded-xl border border-[var(--panel-border)] bg-[#121820]">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div>
          <p className="text-sm font-semibold">
            {offering
              ? classLabel(offering)
              : meeting.offeringId}
          </p>
          <p className="text-xs text-[var(--muted)]">
            {when} · {meeting.attendees.length} athlete
            {meeting.attendees.length === 1 ? '' : 's'}
          </p>
        </div>
        <span className="text-xs text-[var(--muted)]">{open ? 'Close' : 'Open'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 border-t border-[var(--panel-border)] px-3 py-3">
          {canEdit && (
            <label className="text-xs text-[var(--muted)]">
              Which class
              <select
                value={meeting.offeringId}
                onChange={(e) => {
                  const next = setMeetingOffering(meeting.id, e.target.value)
                  if (!next) return
                  const label = getOffering(next.offeringId)
                    ? classLabel(getOffering(next.offeringId)!)
                    : ''
                  if (label) {
                    relabelClassMeetingLogs(meeting.id, label)
                    if (onAthletesChange) {
                      onAthletesChange(relabelMeetingNotes(athletes, meeting.id, label))
                    }
                  }
                }}
                className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-black/30 px-2 text-sm text-[var(--text)]"
              >
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {classLabel(o)}
                  </option>
                ))}
                {!offerings.some((o) => o.id === meeting.offeringId) && (
                  <option value={meeting.offeringId}>{meeting.offeringId}</option>
                )}
              </select>
            </label>
          )}
          {flash && (
            <p className="rounded-lg border border-[var(--accent)]/40 bg-[#102820] px-3 py-2 text-xs font-semibold text-[var(--accent)]">
              {flash}
            </p>
          )}
          {people.length === 0 && guests.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nobody was marked here.</p>
          ) : null}
          {people.map((person) => (
            <AthleteRecap
              key={person.id}
              athlete={person}
              meeting={meeting}
              athletes={athletes}
              viewer={viewer}
              canEdit={canEdit}
              onAthletesChange={onAthletesChange}
              onRemove={
                canEdit
                  ? () => {
                      removeClassAttendance(meeting.id, person.id)
                      setFlash(`${person.name.split(' ')[0]} is off this recap. Class holds already logged stay on their homework.`)
                    }
                  : undefined
              }
            />
          ))}
          {guests.map((row) => (
            <p key={`${row.firstName}-${row.lastName}`} className="text-sm text-[var(--muted)]">
              {attendeeLabel(row, athletes)} — no profile, so no saved grades or notes.
            </p>
          ))}
          {canEdit && addable.length > 0 && (
            <div className="mt-1 flex flex-col gap-2 rounded-lg border border-white/10 bg-black/20 p-2">
              <p className="text-xs text-[var(--muted)]">
                Add someone who was here. That writes Class nights and copies holds already logged in this class.
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={addId}
                  onChange={(e) => setAddId(e.target.value)}
                  className="h-10 min-w-[10rem] flex-1 rounded-lg border border-white/10 bg-black/30 px-2 text-sm"
                >
                  <option value="">Pick an athlete…</option>
                  {addable.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!addId}
                  onClick={() => addAthleteToRecap(addId)}
                  className="h-10 rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-[#06281f] disabled:opacity-40"
                >
                  Add + log class
                </button>
              </div>
            </div>
          )}
          {askDelete ? (
            <div className="mt-2 rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] p-3">
              <p className="text-sm font-semibold text-[var(--text)]">Delete this class recap?</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Are you sure? This recap leaves every device. Grades and notes on profiles stay.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    deleteClassMeeting(meeting.id)
                    setAskDelete(false)
                  }}
                  className="rounded-lg bg-[var(--bad)] px-3 py-1.5 text-xs font-semibold text-white"
                >
                  Yes, delete it
                </button>
                <button
                  type="button"
                  onClick={() => setAskDelete(false)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold"
                >
                  Keep it
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setAskDelete(true)}
              className="mt-1 self-start text-xs font-semibold text-[var(--bad)] underline"
            >
              Delete this recap
            </button>
          )}
        </div>
      )}
    </li>
  )
}

function AthleteRecap({
  athlete,
  meeting,
  athletes,
  viewer,
  canEdit,
  onAthletesChange,
  onRemove,
}: {
  athlete: Athlete
  meeting: ClassMeeting
  athletes: Athlete[]
  viewer: Athlete | null
  canEdit: boolean
  onAthletesChange?: (next: Athlete[]) => void
  onRemove?: () => void
}) {
  const tests = athlete.shapeTests ?? []
  const latest = tests[tests.length - 1]
  const classNotes = notesForMeeting(athlete, meeting.id)
  const grouped = groupNotesByAuthor(classNotes.length ? classNotes : [])
  const [draft, setDraft] = useState('')

  return (
    <article className="rounded-xl bg-black/25 p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">
          <AthleteName athlete={athlete} size="sm" />
        </p>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[11px] font-semibold text-[var(--muted)] underline"
          >
            Not here
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-col gap-2">
        <CollapsibleSection
          inset
          title="Shape test grades"
          hint={
            latest
              ? `Last ${formatQuizScore(latest)} · ${quizKindLabel(latest)}`
              : 'No shape test on this profile yet'
          }
        >
          {tests.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No saved shape-test scores.</p>
          ) : (
            <ul className="space-y-1.5">
              {[...tests].reverse().map((row) => (
                <li key={row.id} className="flex justify-between gap-2 text-sm">
                  <span className="text-[var(--muted)]">
                    {new Date(row.takenAt).toLocaleString()} · {quizKindLabel(row)}
                  </span>
                  <span className="font-semibold tabular-nums text-[var(--accent)]">
                    {formatQuizScore(row)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CollapsibleSection>
        <CollapsibleSection
          inset
          title="Notes"
          hint={
            grouped.length
              ? grouped.map((g) => `${g.authorName.split(' ')[0]} · ${g.notes.length}`).join(' · ')
              : 'No notes from this class'
          }
        >
          {grouped.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No notes from this class yet. Coaches can add them after class ends.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {grouped.map((group) => (
                <div key={group.authorId}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                    {group.authorName}
                  </p>
                  <ul className="mt-1 space-y-2">
                    {group.notes.map((note) => (
                      <NoteRow
                        key={note.id}
                        note={note}
                        athlete={athlete}
                        athletes={athletes}
                        viewer={viewer}
                        canEdit={canEdit}
                        onAthletesChange={onAthletesChange}
                      />
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {canEdit && viewer && onAthletesChange && (
            <div className="mt-3 flex flex-col gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                placeholder={`Note from ${viewer.name.split(' ')[0]} about ${athlete.name.split(' ')[0]}…`}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!draft.trim()}
                onClick={() => {
                  onAthletesChange(
                    addCoachNotesToAthletes(athletes, [athlete.id], {
                      author: viewer,
                      text: draft.trim(),
                      meetingId: meeting.id,
                      className: getOffering(meeting.offeringId)
                        ? classLabel(getOffering(meeting.offeringId)!)
                        : undefined,
                    }),
                  )
                  setDraft('')
                }}
                className="h-10 self-start rounded-lg bg-[var(--accent)] px-3 text-sm font-bold text-[#06281f] disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          )}
        </CollapsibleSection>
      </div>
    </article>
  )
}

function NoteRow({
  note,
  athlete,
  athletes,
  viewer,
  canEdit,
  onAthletesChange,
}: {
  note: AthleteCoachNote
  athlete: Athlete
  athletes: Athlete[]
  viewer: Athlete | null
  canEdit: boolean
  onAthletesChange?: (next: Athlete[]) => void
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note.text)
  const mine = Boolean(viewer && canEditCoachNote(viewer, note))

  return (
    <li className="rounded-lg bg-black/25 px-3 py-2 text-sm">
      {note.topicLabel && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          {note.topicLabel}
        </p>
      )}
      {editing ? (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!text.trim() || !viewer || !onAthletesChange}
              onClick={() => {
                if (!viewer || !onAthletesChange) return
                onAthletesChange(applyCoachNoteUpdate(athletes, athlete.id, note.id, text, viewer))
                setEditing(false)
              }}
              className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[#06281f] disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setText(note.text)
                setEditing(false)
              }}
              className="text-xs text-[var(--muted)] underline"
            >
              Keep
            </button>
          </div>
        </div>
      ) : (
        <p>{note.text}</p>
      )}
      <p className="mt-0.5 text-[11px] text-[var(--muted)]">
        {note.authorName}
        {note.className ? ` · ${note.className}` : ''}
        {' · '}
        {new Date(note.updatedAt ?? note.createdAt).toLocaleString()}
        {note.updatedAt ? ' · edited' : ''}
      </p>
      {canEdit && mine && !editing && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-[11px] font-semibold text-[var(--accent)] underline"
        >
          Edit
        </button>
      )}
    </li>
  )
}
