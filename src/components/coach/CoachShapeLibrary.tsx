import { useEffect, useState } from 'react'
import { SHAPES } from '../../config/shapes'
import {
  deleteCoachShape,
  deleteCoachSkillRef,
  deleteGymLibraryShape,
  emptyCoachShape,
  emptyCoachSkillRef,
  listCoachShapes,
  listCoachSkillRefs,
  listGymLibraryShapes,
  saveCoachShape,
  saveCoachSkillRef,
  subscribeCoachContent,
  uploadCoachMedia,
} from '../../lib/coachContentStore'
import { AddGymShapeForm } from '../AddGymShapeForm'
import { compressImageFile } from '../../lib/mediaCompress'
import { videoFileAccept } from '../../lib/saveMedia'
import { createId } from '../../lib/storage'
import { isCoachProfile, isGymAdmin } from '../../lib/profileRole'
import type { Athlete, CoachShape, CoachShapeMedia, CoachSkillRef } from '../../types'
import { FramedPhoto } from './FramedPhoto'
import { ShapeSnapCamera } from './ShapeSnapCamera'
import { SimpleCropper } from './SimpleCropper'

type Props = {
  signedIn: Athlete | null
}

const SCORE_OPTIONS = [...SHAPES].sort((a, b) => a.name.localeCompare(b.name))

function groupByCoach<T extends { coachId: string; coachName: string }>(rows: T[]) {
  const map = new Map<string, { name: string; rows: T[] }>()
  for (const row of rows) {
    const g = map.get(row.coachId) ?? { name: row.coachName, rows: [] }
    g.rows.push(row)
    if (row.coachName) g.name = row.coachName
    map.set(row.coachId, g)
  }
  return [...map.entries()].sort((a, b) => a[1].name.localeCompare(b[1].name))
}

export function CoachShapeLibrary({ signedIn }: Props) {
  const [tick, setTick] = useState(0)
  const [editing, setEditing] = useState<CoachShape | null>(null)
  const [editingRef, setEditingRef] = useState<CoachSkillRef | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const coach = Boolean(signedIn && isCoachProfile(signedIn))
  const admin = Boolean(signedIn && isGymAdmin(signedIn))

  useEffect(() => subscribeCoachContent(() => setTick((n) => n + 1)), [])
  void tick

  const shapes = listCoachShapes()
  const refs = listCoachSkillRefs()
  const gymShapes = listGymLibraryShapes()
  const mine = coach && signedIn ? shapes.filter((s) => s.coachId === signedIn.id) : []
  const others =
    admin && signedIn ? shapes.filter((s) => s.coachId !== signedIn.id) : []
  const myRefs = coach && signedIn ? refs.filter((r) => r.coachId === signedIn.id) : []
  const otherRefs =
    admin && signedIn ? refs.filter((r) => r.coachId !== signedIn.id) : []

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Coach library</p>
        <h2 className="text-xl font-semibold">Shapes and skill references</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Add a shape to the <strong className="text-[var(--text)]">gym library</strong> so
          it appears in Learn and in homework assignment for everyone. Private
          shapes stay on your coach card. Skill videos show up in Compare next
          to the UG clips
          {admin ? '. As gym admin, you can also view every coach’s private work' : ''}.
        </p>
        {coach && signedIn && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
              onClick={() => {
                setEditingRef(null)
                setEditing(emptyCoachShape(signedIn.id, signedIn.name))
              }}
            >
              Add a private shape
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              onClick={() => {
                setEditing(null)
                setEditingRef(emptyCoachSkillRef(signedIn.id, signedIn.name))
              }}
            >
              Add a skill video
            </button>
          </div>
        )}
        {!signedIn && (
          <p className="mt-3 text-sm text-[var(--muted)]">Unlock a coach profile to open its library.</p>
        )}
        {signedIn && !coach && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Coach libraries stay private. Athlete examples shared by a coach will
            appear in lessons and references where appropriate.
          </p>
        )}
      </section>

      {editing && signedIn && (
        <ShapeEditor
          shape={editing}
          coachId={editing.coachId}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          onError={setErr}
        />
      )}
      {editingRef && signedIn && (
        <SkillRefEditor
          draft={editingRef}
          coachId={editingRef.coachId}
          onCancel={() => setEditingRef(null)}
          onSaved={() => setEditingRef(null)}
          onError={setErr}
        />
      )}
      {err && <p className="text-sm text-[var(--bad)]">{err}</p>}

      {coach && signedIn && (
        <section className="rounded-xl border border-[var(--accent)]/35 bg-[var(--panel)] p-4">
          <h3 className="font-semibold">Gym shape library</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            These shapes are gym-wide — Learn, homework pickers, and lesson
            assignment all see them.
          </p>
          <div className="mt-3">
            <AddGymShapeForm signedIn={signedIn} />
          </div>
          {gymShapes.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No gym-wide shapes yet. Add one above.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {gymShapes.map((s) => (
                <li key={s.id} className="rounded-lg bg-[#121820] p-3">
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.bodyPosition && <p className="mt-1 text-sm">{s.bodyPosition}</p>}
                  {s.description && (
                    <p className="mt-1 text-sm text-[var(--muted)]">{s.description}</p>
                  )}
                  <p className="mt-1 text-[11px] text-[var(--muted)]">
                    Added by {s.createdByName}
                    {s.scoreShapeId ? ' · camera grades like a shipped shape' : ''}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs text-[var(--bad)] underline"
                    onClick={() => {
                      if (window.confirm(`Remove ${s.name} from the gym library?`)) {
                        deleteGymLibraryShape(s.id)
                      }
                    }}
                  >
                    Remove from gym library
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {mine.length > 0 && (
        <ShapeList
          title="Your shapes"
          shapes={mine}
          canEdit
          onEdit={setEditing}
          onDelete={(id) => deleteCoachShape(id)}
        />
      )}
      {myRefs.length > 0 && (
        <SkillRefList
          title="Your skill references"
          refs={myRefs}
          canEdit
          onEdit={setEditingRef}
          onDelete={(id) => deleteCoachSkillRef(id)}
        />
      )}

      {groupByCoach(others).map(([id, g]) => (
        <ShapeList
          key={`sh-${id}`}
          title={`${g.name}’s shapes`}
          shapes={g.rows}
          canEdit={false}
          onEdit={setEditing}
          onDelete={(sid) => deleteCoachShape(sid)}
        />
      ))}
      {groupByCoach(otherRefs).map(([id, g]) => (
        <SkillRefList
          key={`rf-${id}`}
          title={`${g.name}’s skill references`}
          refs={g.rows}
          canEdit={false}
          onEdit={setEditingRef}
          onDelete={(rid) => deleteCoachSkillRef(rid)}
        />
      ))}
      {admin && others.length === 0 && otherRefs.length === 0 && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="font-semibold">Other coaches</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            No other coach has saved a shape or skill reference yet. When they do,
            their library will appear here for admin review.
          </p>
        </section>
      )}
    </div>
  )
}

function ShapeList({
  title,
  shapes,
  canEdit,
  onEdit,
  onDelete,
}: {
  title: string
  shapes: CoachShape[]
  canEdit: boolean
  onEdit: (s: CoachShape) => void
  onDelete: (id: string) => void
}) {
  if (shapes.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">Nothing here yet.</p>
      </section>
    )
  }
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {shapes.map((s) => {
          const photo = s.media.find((m) => m.kind === 'photo')
          const video = s.media.find((m) => m.kind === 'video')
          return (
            <li key={s.id} className="rounded-lg bg-[#121820] p-3">
              <p className="text-sm font-semibold">{s.name || 'Untitled'}</p>
              <p className="text-xs text-[var(--muted)]">{s.coachName}</p>
              {s.bodyPosition && <p className="mt-1 text-sm">{s.bodyPosition}</p>}
              {s.description && <p className="mt-1 text-sm text-[var(--muted)]">{s.description}</p>}
              {photo && (
                <FramedPhoto
                  src={photo.src}
                  crop={photo.crop}
                  alt={s.name}
                  className="mt-2 max-h-48 w-full rounded-md object-contain"
                />
              )}
              {video && (
                <video className="mt-2 max-h-48 w-full rounded-md" src={video.src} controls playsInline />
              )}
              {s.progressions.length > 0 && (
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                  {s.progressions.map((p) => (
                    <li key={p.id}>
                      <strong>{p.title}</strong>
                      {p.notes ? ` — ${p.notes}` : ''}
                    </li>
                  ))}
                </ol>
              )}
              {canEdit && (
                <div className="mt-2 flex gap-3">
                  <button type="button" className="text-xs underline" onClick={() => onEdit(s)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--bad)] underline"
                    onClick={() => {
                      if (window.confirm(`Remove ${s.name || 'this shape'}?`)) onDelete(s.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SkillRefList({
  title,
  refs,
  canEdit,
  onEdit,
  onDelete,
}: {
  title: string
  refs: CoachSkillRef[]
  canEdit: boolean
  onEdit: (r: CoachSkillRef) => void
  onDelete: (id: string) => void
}) {
  if (refs.length === 0) return null
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-3 flex flex-col gap-3">
        {refs.map((r) => (
          <li key={r.id} className="rounded-lg bg-[#121820] p-3">
            <p className="text-sm font-semibold">{r.name || 'Untitled skill'}</p>
            <p className="text-xs text-[var(--muted)]">
              {r.coachName}
              {r.athleteName ? ` · ${r.athleteName}` : ''}
            </p>
            {r.notes && <p className="mt-1 text-sm text-[var(--muted)]">{r.notes}</p>}
            {r.src && (
              <video
                className="mt-2 max-h-48 w-full rounded-md"
                src={r.src}
                controls
                playsInline
              />
            )}
            {canEdit && (
              <div className="mt-2 flex gap-3">
                <button type="button" className="text-xs underline" onClick={() => onEdit(r)}>
                  Edit
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--bad)] underline"
                  onClick={() => {
                    if (window.confirm(`Remove ${r.name || 'this skill video'}?`)) onDelete(r.id)
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function SkillRefEditor({
  draft: initial,
  coachId,
  onCancel,
  onSaved,
  onError,
}: {
  draft: CoachSkillRef
  coachId: string
  onCancel: () => void
  onSaved: () => void
  onError: (msg: string | null) => void
}) {
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)

  const addVideo = async (file: File | null, url?: string) => {
    setBusy(true)
    onError(null)
    try {
      let src = url?.trim() ?? ''
      if (file) src = await uploadCoachMedia({ ownerId: coachId, file, name: file.name })
      if (!src) return
      setDraft((d) => ({ ...d, src }))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save that video.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--accent)]/35 bg-[var(--panel)] p-4">
      <h3 className="font-semibold">Skill reference video</h3>
      <p className="mt-1 text-xs text-[var(--muted)]">
        A tumbling pass, vault, or other skill — not just a static shape. Compare
        can play this next to the UG library.
      </p>
      <div className="mt-3 flex flex-col gap-2">
        <input
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Name (round-off BHS, Yurchenko timer…)"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
          placeholder="What to watch for"
          value={draft.notes ?? ''}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        <div className="flex flex-wrap gap-2">
          <label className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm">
            Upload video
            <input
              type="file"
              accept={videoFileAccept('video/*')}
              className="hidden"
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void addVideo(f)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        <input
          className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Or paste a public video URL"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              void addVideo(null, (e.target as HTMLInputElement).value)
              ;(e.target as HTMLInputElement).value = ''
            }
          }}
        />
        {draft.src && (
          <video className="mt-1 max-h-56 w-full rounded-md" src={draft.src} controls playsInline />
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!draft.name.trim() || !draft.src || busy}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
            onClick={() => {
              saveCoachSkillRef({ ...draft, name: draft.name.trim() })
              onSaved()
            }}
          >
            Save skill video
          </button>
          <button
            type="button"
            className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}

function ShapeEditor({
  shape,
  coachId,
  onCancel,
  onSaved,
  onError,
}: {
  shape: CoachShape
  coachId: string
  onCancel: () => void
  onSaved: () => void
  onError: (msg: string | null) => void
}) {
  const [draft, setDraft] = useState(shape)
  const [cropId, setCropId] = useState<string | null>(
    shape.media.find((m) => m.kind === 'photo')?.id ?? null,
  )
  const [busy, setBusy] = useState(false)
  const [snapOpen, setSnapOpen] = useState(false)

  const addPhoto = async (file: File) => {
    setBusy(true)
    onError(null)
    try {
      const src = await compressImageFile(file)
      const media: CoachShapeMedia = { id: createId('csm'), kind: 'photo', src }
      setDraft((d) => ({ ...d, media: [media, ...d.media] }))
      setCropId(media.id)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not read that picture.')
    } finally {
      setBusy(false)
    }
  }

  const addVideo = async (file: File | null, url?: string) => {
    setBusy(true)
    onError(null)
    try {
      let src = url?.trim() ?? ''
      if (file) src = await uploadCoachMedia({ ownerId: coachId, file, name: file.name })
      if (!src) return
      const media: CoachShapeMedia = { id: createId('csm'), kind: 'video', src }
      setDraft((d) => ({ ...d, media: [media, ...d.media] }))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save that video.')
    } finally {
      setBusy(false)
    }
  }

  const cropTarget = draft.media.find((m) => m.id === cropId && m.kind === 'photo')

  return (
    <section className="rounded-xl border border-[var(--accent)]/35 bg-[var(--panel)] p-4">
      <h3 className="font-semibold">Write the shape</h3>
      <div className="mt-3 flex flex-col gap-2">
        <input
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Name (handstand, cartwheel step-in…)"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
          placeholder="What it looks like — body position"
          value={draft.bodyPosition}
          onChange={(e) => setDraft({ ...draft, bodyPosition: e.target.value })}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
          placeholder="How you coach it"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        <label className="text-sm">
          <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Live camera grades this gym shape (optional)
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            value={draft.scoreShapeId ?? ''}
            onChange={(e) => setDraft({ ...draft, scoreShapeId: e.target.value || undefined })}
          >
            <option value="">No live score</option>
            {SCORE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Progressions</p>
          <p className="text-xs text-[var(--muted)]">The order you want them to learn it.</p>
          {draft.progressions.map((p, i) => (
            <div key={p.id} className="mt-2 rounded-lg bg-[#121820] p-2">
              <input
                className="w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-sm"
                placeholder={`Step ${i + 1} name`}
                value={p.title}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    progressions: draft.progressions.map((x) =>
                      x.id === p.id ? { ...x, title: e.target.value } : x,
                    ),
                  })
                }
              />
              <textarea
                className="mt-1 w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-sm"
                rows={2}
                placeholder="Criteria / cue for this step"
                value={p.notes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    progressions: draft.progressions.map((x) =>
                      x.id === p.id ? { ...x, notes: e.target.value } : x,
                    ),
                  })
                }
              />
              <button
                type="button"
                className="mt-1 text-[11px] text-[var(--bad)] underline"
                onClick={() =>
                  setDraft({ ...draft, progressions: draft.progressions.filter((x) => x.id !== p.id) })
                }
              >
                Remove step
              </button>
            </div>
          ))}
          <button
            type="button"
            className="mt-2 text-xs underline"
            onClick={() =>
              setDraft({
                ...draft,
                progressions: [
                  ...draft.progressions,
                  { id: createId('prg'), title: '', notes: '' },
                ],
              })
            }
          >
            Add a progression
          </button>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Pictures and video</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f] disabled:opacity-40"
              onClick={() => setSnapOpen(true)}
            >
              Snap a photo
            </button>
            <label className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm">
              Upload picture
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void addPhoto(f)
                  e.target.value = ''
                }}
              />
            </label>
            <label className="rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm">
              Upload video
              <input
                type="file"
                accept={videoFileAccept('video/*')}
                className="hidden"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void addVideo(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>
          {snapOpen && (
            <ShapeSnapCamera
              onCapture={(file) => {
                void addPhoto(file)
              }}
              onClose={() => setSnapOpen(false)}
            />
          )}
          <input
            className="mt-2 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            placeholder="Or paste a public video URL"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                void addVideo(null, (e.target as HTMLInputElement).value)
                ;(e.target as HTMLInputElement).value = ''
              }
            }}
          />
          {cropTarget && (
            <div className="mt-3">
              <SimpleCropper
                src={cropTarget.src}
                crop={cropTarget.crop}
                onChange={(crop) =>
                  setDraft({
                    ...draft,
                    media: draft.media.map((m) => (m.id === cropTarget.id ? { ...m, crop } : m)),
                  })
                }
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!draft.name.trim() || busy}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
            onClick={() => {
              saveCoachShape({ ...draft, name: draft.name.trim() })
              onSaved()
            }}
          >
            Save shape
          </button>
          <button type="button" className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  )
}
