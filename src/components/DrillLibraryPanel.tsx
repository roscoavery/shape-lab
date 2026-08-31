/**
 * Ryan’s private drill library. Upload clips here. Linking a shape
 * publishes that video on the shape in Learn for everyone.
 */

import { useEffect, useState } from 'react'
import { SHAPES, getShape } from '../config/shapes'
import {
  deleteDrill,
  emptyDrill,
  listDrills,
  saveDrill,
  subscribeCoachContent,
  uploadCoachMedia,
} from '../lib/coachContentStore'
import type { Athlete, DrillClip } from '../types'

type Props = {
  signedIn: Athlete | null
}

const SHAPE_OPTIONS = [...SHAPES].sort((a, b) => a.name.localeCompare(b.name))

export function DrillLibraryPanel({ signedIn }: Props) {
  const [tick, setTick] = useState(0)
  const [editing, setEditing] = useState<DrillClip | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => subscribeCoachContent(() => setTick((n) => n + 1)), [])
  void tick

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-3xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
        Unlock Ryan to open the drill library.
      </div>
    )
  }

  const drills = listDrills()

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Just for you</p>
        <h2 className="text-xl font-semibold">Drill library</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Upload drill clips here. This list stays on your profile. If you
          attach a shape, that video shows on the shape in Learn — and coaches
          can assign it as homework.
        </p>
        <button
          type="button"
          className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
          onClick={() => {
            setErr(null)
            setEditing(emptyDrill())
          }}
        >
          Add a drill
        </button>
      </section>

      {editing && (
        <DrillEditor
          draft={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => setEditing(null)}
          onError={setErr}
        />
      )}
      {err && <p className="text-sm text-[var(--bad)]">{err}</p>}

      {drills.length === 0 && !editing && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <p className="text-sm text-[var(--muted)]">
            No drills yet. Add one and drop the video in — start with the
            candlestick drill.
          </p>
        </section>
      )}

      {drills.length > 0 && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
          <h3 className="font-semibold">Your drills</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {drills.map((d) => (
              <li key={d.id} className="rounded-lg bg-[#121820] p-3">
                <p className="text-sm font-semibold">{d.title || 'Untitled drill'}</p>
                {d.shapeId && (
                  <p className="text-[11px] text-[var(--accent)]">
                    On {getShape(d.shapeId)?.name ?? d.shapeId} in Learn
                  </p>
                )}
                {d.notes && <p className="mt-1 text-sm text-[var(--muted)]">{d.notes}</p>}
                {d.src ? (
                  <video className="mt-2 max-h-56 w-full rounded-md" src={d.src} controls playsInline />
                ) : (
                  <p className="mt-2 text-xs text-[var(--warn)]">No video yet — edit and upload.</p>
                )}
                <div className="mt-2 flex gap-3">
                  <button type="button" className="text-xs underline" onClick={() => setEditing(d)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--bad)] underline"
                    onClick={() => {
                      if (window.confirm(`Remove ${d.title || 'this drill'}?`)) deleteDrill(d.id)
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function DrillEditor({
  draft: initial,
  onCancel,
  onSaved,
  onError,
}: {
  draft: DrillClip
  onCancel: () => void
  onSaved: () => void
  onError: (msg: string | null) => void
}) {
  const [draft, setDraft] = useState(initial)
  const [busy, setBusy] = useState(false)

  const addVideo = async (file: File | null) => {
    if (!file) return
    setBusy(true)
    onError(null)
    try {
      const src = await uploadCoachMedia({
        ownerId: 'ryan',
        file,
        name: file.name,
      })
      setDraft((d) => ({ ...d, src }))
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save that video.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--accent)]/35 bg-[var(--panel)] p-4">
      <h3 className="font-semibold">Write the drill</h3>
      <div className="mt-3 flex flex-col gap-2">
        <input
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Name (candlestick drill…)"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={4}
          placeholder="What they should do"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        <label className="text-sm">
          <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Show on this shape in Learn (optional)
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            value={draft.shapeId ?? ''}
            onChange={(e) => setDraft({ ...draft, shapeId: e.target.value || undefined })}
          >
            <option value="">Keep private — no shape page</option>
            {SHAPE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="self-start rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm">
          {busy ? 'Uploading…' : draft.src ? 'Replace video' : 'Upload video'}
          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void addVideo(f)
              e.target.value = ''
            }}
          />
        </label>
        {draft.src && (
          <video className="max-h-56 w-full rounded-md" src={draft.src} controls playsInline />
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!draft.title.trim() || busy}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
            onClick={() => {
              saveDrill({ ...draft, title: draft.title.trim() })
              onSaved()
            }}
          >
            Save drill
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
