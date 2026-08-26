/**
 * Athlete hit folder — snapshots (and clips) grouped by shape.
 */

import { useEffect, useState } from 'react'
import {
  getCaptureBlob,
  groupCapturesByShape,
  type TaskCapture,
} from '../lib/captureStore'

type Preview = { url: string; kind: 'snapshot' | 'clip'; label: string }

type Props = {
  captures: TaskCapture[]
  athleteName?: string | null
  onDelete?: (id: string) => void
}

export function HitFolder({ captures, athleteName, onDelete }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const groups = groupCapturesByShape(captures)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  const open = async (c: TaskCapture) => {
    const blob = await getCaptureBlob(c.id)
    if (!blob) return
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview({
      url: URL.createObjectURL(blob),
      kind: c.kind,
      label: c.shapeName,
    })
  }

  return (
    <div className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3">
      <p className="mb-1 text-xs uppercase tracking-wider text-[var(--muted)]">
        {athleteName ? `${athleteName}'s shapes` : 'Your shapes'} — hit folder
      </p>
      {!groups.length ? (
        <p className="text-xs text-[var(--muted)]">
          When you hit a shape, a still is saved here — one folder per position, so you can
          see what your body looked like on the hit.
        </p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g.shapeId}>
              <p className="mb-1 text-sm font-medium text-[var(--text)]">
                {g.shapeName}{' '}
                <span className="text-[11px] font-normal text-[var(--muted)]">
                  {g.snapshots.length} photo{g.snapshots.length === 1 ? '' : 's'}
                  {g.clips.length
                    ? ` · ${g.clips.length} clip${g.clips.length === 1 ? '' : 's'}`
                    : ''}
                </span>
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {g.snapshots.map((c) => (
                  <Thumb
                    key={c.id}
                    capture={c}
                    onOpen={() => void open(c)}
                    onDelete={onDelete}
                  />
                ))}
                {g.clips.map((c) => (
                  <Thumb
                    key={c.id}
                    capture={c}
                    onOpen={() => void open(c)}
                    onDelete={onDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {preview && (
        <div className="mt-3">
          {preview.kind === 'clip' ? (
            <video src={preview.url} controls className="max-h-52 w-full rounded bg-black" />
          ) : (
            <img
              src={preview.url}
              alt={preview.label}
              className="max-h-52 w-full rounded object-contain"
            />
          )}
          <button
            type="button"
            className="mt-1 text-xs text-[var(--muted)] underline"
            onClick={() => {
              URL.revokeObjectURL(preview.url)
              setPreview(null)
            }}
          >
            Close preview
          </button>
        </div>
      )}
    </div>
  )
}

function Thumb({
  capture,
  onOpen,
  onDelete,
}: {
  capture: TaskCapture
  onOpen: () => void
  onDelete?: (id: string) => void
}) {
  return (
    <div className="shrink-0 rounded border border-[var(--panel-border)] px-2 py-1 text-left text-xs">
      <button type="button" className="block hover:text-white" onClick={onOpen}>
        <div className="font-medium text-[var(--text)]">
          {capture.kind === 'clip' ? 'clip' : 'photo'}
        </div>
        <div className="text-[var(--muted)]">
          {new Date(capture.createdAt).toLocaleTimeString()}
        </div>
      </button>
      {onDelete && (
        <button
          type="button"
          className="mt-0.5 text-[10px] text-[var(--bad)]"
          onClick={() => onDelete(capture.id)}
        >
          remove
        </button>
      )}
    </div>
  )
}
