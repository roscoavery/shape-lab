/**
 * Learn → coach notes. Same reader for tumbling physics, anatomy, and
 * progression / blocks. Ryan can edit and save the text on the gym computer.
 */

import { useEffect, useMemo, useState } from 'react'
import { PHYSICS_LESSONS, type PhysicsLesson } from '../../config/tumblingPhysics'
import {
  applyLearnOverlay,
  overlayFromDraft,
  pullLearnNotes,
  pushLearnNotes,
  type LearnNoteOverlay,
} from '../../lib/learnNotesStore'
import { useShapeCopy } from '../ShapeCopyContext'
import { MediaLightbox } from '../MediaLightbox'

type Props = {
  onTakeTest?: () => void
  lessons?: PhysicsLesson[]
  heading?: string
  testLabel?: string
}

function groupLessons(lessons: PhysicsLesson[]): { title: string; items: PhysicsLesson[] }[] {
  const groups: { title: string; items: PhysicsLesson[] }[] = []
  for (const lesson of lessons) {
    const title = lesson.section ?? ''
    const last = groups[groups.length - 1]
    if (last && last.title === title) last.items.push(lesson)
    else groups.push({ title, items: [lesson] })
  }
  return groups
}

export function PhysicsLessons({
  onTakeTest,
  lessons = PHYSICS_LESSONS,
  heading = 'Tumbling physics',
  testLabel = 'Physics in tumbling test →',
}: Props) {
  const { canEdit } = useShapeCopy()
  const [openId, setOpenId] = useState<string | null>(lessons[0]?.id ?? null)
  const [overlays, setOverlays] = useState<Record<string, LearnNoteOverlay>>({})
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [kicker, setKicker] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [gym, setGym] = useState('')
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)
  const [imageOpen, setImageOpen] = useState(false)

  useEffect(() => {
    setOpenId(lessons[0]?.id ?? null)
    setEditing(false)
  }, [lessons])

  useEffect(() => {
    void pullLearnNotes().then(setOverlays)
  }, [])

  const resolved = useMemo(
    () => lessons.map((l) => applyLearnOverlay(l, overlays[l.id])),
    [lessons, overlays],
  )
  const groups = useMemo(() => groupLessons(resolved), [resolved])
  const open = resolved.find((l) => l.id === openId) ?? resolved[0]

  useEffect(() => {
    if (!open) return
    setTitle(open.title)
    setKicker(open.kicker)
    setBodyText(open.body.join('\n\n'))
    setGym(open.gym)
    setFlash(null)
    setEditing(false)
    setImageOpen(false)
  }, [open?.id])

  const save = async () => {
    if (!open) return
    setBusy(true)
    setFlash(null)
    try {
      const next = {
        ...overlays,
        [open.id]: overlayFromDraft({ title, kicker, bodyText, gym }),
      }
      const saved = await pushLearnNotes(next)
      setOverlays(saved)
      setEditing(false)
      setFlash('Saved into the app — every gym link has this text.')
    } catch {
      setFlash('Could not save — keep the Shape Lab server running.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="flex flex-col gap-3">
        {groups.map((group, i) => (
          <div key={group.title || `group-${i}`} className="flex flex-col gap-1">
            {group.title ? (
              <p className="px-3 pt-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {group.title}
              </p>
            ) : null}
            {group.items.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                onClick={() => setOpenId(lesson.id)}
                className={`rounded-lg px-3 py-2 text-left text-sm ${
                  open?.id === lesson.id
                    ? 'bg-[var(--accent-dim)] font-semibold text-white'
                    : 'text-[var(--muted)] hover:bg-[#152018] hover:text-[var(--text)]'
                }`}
              >
                {lesson.title}
              </button>
            ))}
          </div>
        ))}
      </nav>
      {open && (
        <article className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {open.section ?? heading}
          </p>
          {editing ? (
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Title
                </span>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Kicker
                </span>
                <input
                  value={kicker}
                  onChange={(e) => setKicker(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Notes — blank line between paragraphs
                </span>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  rows={14}
                  className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm leading-relaxed text-[var(--text)]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  In the gym
                </span>
                <textarea
                  value={gym}
                  onChange={(e) => setGym(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
                />
              </label>
            </div>
          ) : (
            <>
              <h3 className="mt-1 text-xl font-semibold text-[var(--text)]">{open.title}</h3>
              <p className="mt-2 text-sm font-medium text-[var(--text)]">{open.kicker}</p>
              <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--muted)]">
                {open.body.map((p, i) => (
                  <p key={`${open.id}-p-${i}`}>{p}</p>
                ))}
              </div>
              <p className="mt-4 rounded-lg border border-[var(--panel-border)] bg-[#152018] px-3 py-2 text-sm text-[var(--text)]">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                  In the gym
                </span>
                <span className="mt-1 block">{open.gym}</span>
              </p>
            </>
          )}

          {open.image && (
            <button
              type="button"
              onClick={() => setImageOpen(true)}
              className="mt-4 block w-full overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#0d1218] text-left"
            >
              <img
                src={open.image.src}
                alt={open.image.alt}
                className="max-h-80 w-full object-contain"
              />
              <span className="block px-3 py-2 text-xs font-medium text-[var(--accent)]">
                Open the 4 levels / blocks picture full screen
              </span>
            </button>
          )}

          {canEdit && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {editing ? (
                <>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void save()}
                    className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-40"
                  >
                    {busy ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setTitle(open.title)
                      setKicker(open.kicker)
                      setBodyText(open.body.join('\n\n'))
                      setGym(open.gym)
                      setEditing(false)
                      setFlash(null)
                    }}
                    className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-medium text-white"
                >
                  Edit
                </button>
              )}
            </div>
          )}
          {flash && <p className="mt-2 text-sm text-[var(--accent)]">{flash}</p>}

          {onTakeTest && (
            <button
              type="button"
              onClick={onTakeTest}
              className="mt-4 rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-medium text-white"
            >
              {testLabel}
            </button>
          )}
        </article>
      )}
      {imageOpen && open?.image && (
        <MediaLightbox
          src={open.image.src}
          kind="image"
          alt={open.image.alt}
          onClose={() => setImageOpen(false)}
        />
      )}
    </div>
  )
}
