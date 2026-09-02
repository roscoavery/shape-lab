/**
 * Ryan’s private drill library. Compact list, then a quiet 9:16 watch view.
 * Linking a shape publishes that video on the shape in Learn for everyone.
 */

import { useEffect, useState } from 'react'
import { SHAPES, getShape } from '../config/shapes'
import { SHIPPED_DRILL_IDS } from '../config/drills'
import {
  deleteDrill,
  emptyDrill,
  listDrills,
  saveDrill,
  subscribeCoachContent,
  uploadCoachMedia,
} from '../lib/coachContentStore'
import type { Athlete, DrillClip } from '../types'
import { ExpandableNotes, firstCue } from './ExpandableNotes'
import { PortraitVideoPlayer } from './PortraitVideoPlayer'
import { PostToChalkboard } from './chalkboard/PostToChalkboard'

type Props = {
  signedIn: Athlete | null
}

const SHAPE_OPTIONS = [...SHAPES].sort((a, b) => a.name.localeCompare(b.name))

type Screen =
  | { kind: 'list' }
  | { kind: 'watch'; id: string }
  | { kind: 'edit'; draft: DrillClip }

export function DrillLibraryPanel({ signedIn }: Props) {
  const [tick, setTick] = useState(0)
  const [screen, setScreen] = useState<Screen>({ kind: 'list' })
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => subscribeCoachContent(() => setTick((n) => n + 1)), [])
  void tick

  if (!signedIn) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-sm text-[var(--muted)]">
        Unlock Ryan to open the drill library.
      </div>
    )
  }

  const drills = listDrills()
  const watching =
    screen.kind === 'watch' ? drills.find((d) => d.id === screen.id) : undefined

  if (screen.kind === 'watch' && watching) {
    return (
      <DrillWatch
        drill={watching}
        signedIn={signedIn}
        onBack={() => setScreen({ kind: 'list' })}
        onEdit={() => {
          setErr(null)
          setScreen({ kind: 'edit', draft: watching })
        }}
      />
    )
  }

  return (
    <div className="mx-auto grid max-w-lg gap-3">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">Just for you</p>
          <h2 className="text-lg font-semibold">Drill library</h2>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]"
          onClick={() => {
            setErr(null)
            setScreen({ kind: 'edit', draft: emptyDrill() })
          }}
        >
          Add
        </button>
      </header>

      {screen.kind === 'edit' && (
        <DrillEditor
          draft={screen.draft}
          onCancel={() => setScreen({ kind: 'list' })}
          onSaved={() => setScreen({ kind: 'list' })}
          onError={setErr}
        />
      )}
      {err && <p className="text-sm text-[var(--bad)]">{err}</p>}

      {drills.length === 0 && screen.kind !== 'edit' && (
        <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
          No extra drills yet. Add one, or put a video on Candlestick drill.
        </p>
      )}

      {drills.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {drills.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => setScreen({ kind: 'watch', id: d.id })}
                className="flex w-full items-center gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-2.5 py-2 text-left hover:border-[var(--accent-dim)]"
              >
                {d.src ? (
                  <PortraitVideoPlayer src={d.src} title={d.title} size="thumb" />
                ) : (
                  <span className="flex h-[4.75rem] w-[2.7rem] shrink-0 items-center justify-center rounded-md bg-[#0d1218] text-[10px] text-[var(--muted)]">
                    9:16
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{d.title || 'Untitled drill'}</span>
                  {d.shapeId && (
                    <span className="mt-0.5 block text-[11px] text-[var(--accent)]">
                      {getShape(d.shapeId)?.name ?? d.shapeId}
                    </span>
                  )}
                  {d.notes && (
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                      {firstCue(d.notes)}
                    </span>
                  )}
                  {!d.src && (
                    <span className="mt-0.5 block text-[11px] text-[var(--warn)]">No video yet</span>
                  )}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">Open</span>
              </button>
              <div className="px-2.5 pb-2">
                <PostToChalkboard
                  viewer={signedIn}
                  compact
                  draft={{
                    kind: 'drill',
                    title: d.title || 'Drill',
                    url: d.src || undefined,
                    drillId: d.id,
                    shapeId: d.shapeId,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function DrillWatch({
  drill,
  signedIn,
  onBack,
  onEdit,
}: {
  drill: DrillClip
  signedIn: Athlete
  onBack: () => void
  onEdit: () => void
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm text-[var(--muted)] hover:text-[var(--accent)]">
          ← Drills
        </button>
        <button type="button" onClick={onEdit} className="text-xs font-semibold text-[var(--accent)]">
          {SHIPPED_DRILL_IDS.has(drill.id) ? 'Video' : 'Edit'}
        </button>
      </div>

      <h2 className="truncate text-center text-base font-semibold">{drill.title || 'Untitled drill'}</h2>
      {drill.shapeId && (
        <p className="-mt-2 text-center text-[11px] text-[var(--accent)]">
          On {getShape(drill.shapeId)?.name ?? drill.shapeId}
        </p>
      )}

      {drill.src ? (
        <PortraitVideoPlayer src={drill.src} title={drill.title} size="watch" />
      ) : (
        <div className="flex h-[min(52dvh,26rem)] items-center justify-center rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel)]">
          <button
            type="button"
            onClick={onEdit}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
          >
            Add a 9:16 video
          </button>
        </div>
      )}

      {drill.notes && (
        <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            How to
          </p>
          <ExpandableNotes text={drill.notes} previewLines={1} />
        </div>
      )}

      <PostToChalkboard
        viewer={signedIn}
        draft={{
          kind: 'drill',
          title: drill.title || 'Drill',
          url: drill.src || undefined,
          drillId: drill.id,
          shapeId: drill.shapeId,
        }}
      />

      {!SHIPPED_DRILL_IDS.has(drill.id) && (
        <button
          type="button"
          className="self-start text-xs text-[var(--bad)] underline"
          onClick={() => {
            if (window.confirm(`Remove ${drill.title || 'this drill'}?`)) {
              deleteDrill(drill.id)
              onBack()
            }
          }}
        >
          Delete
        </button>
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
    <section className="rounded-xl border border-[var(--accent)]/35 bg-[var(--panel)] p-3">
      <h3 className="font-semibold">{SHIPPED_DRILL_IDS.has(initial.id) ? 'Add / replace video' : 'Write the drill'}</h3>
      <div className="mt-2 flex flex-col gap-2">
        <input
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Name"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={3}
          placeholder="Cues — one idea per line"
          value={draft.notes}
          onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
        />
        <label className="text-sm">
          <span className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Show on this shape
          </span>
          <select
            className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
            value={draft.shapeId ?? ''}
            onChange={(e) => setDraft({ ...draft, shapeId: e.target.value || undefined })}
          >
            <option value="">Keep private</option>
            {SHAPE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="self-start rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm">
          {busy ? 'Uploading…' : draft.src ? 'Replace video' : 'Upload 9:16 video'}
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
        {draft.src && <PortraitVideoPlayer src={draft.src} title={draft.title} size="embed" />}
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
            Save
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
