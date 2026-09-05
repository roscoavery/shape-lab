/**
 * Athlete hit folder — snapshots (and clips) grouped by shape.
 */

import { useEffect, useState } from 'react'
import {
  deleteCapture,
  getCaptureBlob,
  groupCapturesByShape,
  type TaskCapture,
} from '../lib/captureStore'
import { saveResultMessage, saveVideoToDevice } from '../lib/saveMedia'
import { MediaLightbox } from './MediaLightbox'

type Preview = { url: string; kind: 'snapshot' | 'clip'; label: string; id: string }

type Props = {
  captures: TaskCapture[]
  athleteName?: string | null
  onChange?: () => void
}

export function HitFolder({ captures, athleteName, onChange }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null)
  const [askId, setAskId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const groups = groupCapturesByShape(captures)

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  const open = async (c: TaskCapture) => {
    const blob = await getCaptureBlob(c.id)
    if (!blob) {
      setNotice('Could not open that still or clip. The file is not on this device.')
      return
    }
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview({
      url: URL.createObjectURL(blob),
      kind: c.kind,
      label: c.shapeName,
      id: c.id,
    })
  }

  const saveToPhotos = async (id: string, kind: 'snapshot' | 'clip', name: string) => {
    const blob = await getCaptureBlob(id)
    if (!blob) {
      setNotice('Could not load that picture.')
      return
    }
    const ext = kind === 'clip' ? (blob.type.includes('mp4') ? 'mp4' : 'webm') : 'jpg'
    const result = await saveVideoToDevice(blob, `${name.replace(/\s+/g, '-')}.${ext}`)
    setNotice(saveResultMessage(result, kind === 'clip' ? 'video' : 'video'))
  }

  const remove = async (id: string) => {
    await deleteCapture(id)
    if (preview?.id === id) {
      URL.revokeObjectURL(preview.url)
      setPreview(null)
    }
    setAskId(null)
    onChange?.()
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
                {[...g.snapshots, ...g.clips].map((c) => (
                  <Thumb
                    key={c.id}
                    capture={c}
                    asking={askId === c.id}
                    onOpen={() => void open(c)}
                    onSave={() => void saveToPhotos(c.id, c.kind, c.shapeName)}
                    onAskDelete={() => setAskId(c.id)}
                    onCancelDelete={() => setAskId(null)}
                    onConfirmDelete={() => void remove(c.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {notice && <p className="mt-2 text-xs text-[var(--accent)]">{notice}</p>}
      {preview && (
        <MediaLightbox
          src={preview.url}
          kind={preview.kind === 'clip' ? 'video' : 'image'}
          alt={preview.label}
          onClose={() => {
            URL.revokeObjectURL(preview.url)
            setPreview(null)
          }}
        />
      )}
    </div>
  )
}

function Thumb({
  capture,
  asking,
  onOpen,
  onSave,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  capture: TaskCapture
  asking: boolean
  onOpen: () => void
  onSave: () => void
  onAskDelete: () => void
  onCancelDelete: () => void
  onConfirmDelete: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    let cancelled = false
    void getCaptureBlob(capture.id).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [capture.id])

  return (
    <div className="w-28 shrink-0">
      <button
        type="button"
        className="block w-full overflow-hidden rounded-lg border border-[var(--panel-border)] bg-[#0d1218]"
        onClick={onOpen}
      >
        <div className="flex aspect-square items-center justify-center">
          {url ? (
            capture.kind === 'clip' ? (
              <video src={url} muted playsInline className="h-full w-full object-cover" />
            ) : (
              <img
                src={url}
                alt={capture.shapeName}
                className="h-full w-full object-cover"
              />
            )
          ) : (
            <span className="px-1 text-center text-[10px] text-[var(--muted)]">
              {capture.kind === 'clip' ? 'clip' : 'photo'}
            </span>
          )}
        </div>
      </button>
      {asking ? (
        <div className="mt-1 space-y-1">
          <p className="text-[10px] text-[var(--text)]">Are you sure?</p>
          <button
            type="button"
            className="text-[10px] font-semibold text-[var(--bad)] underline"
            onClick={onConfirmDelete}
          >
            Yes, delete
          </button>
          <button
            type="button"
            className="ml-2 text-[10px] text-[var(--muted)] underline"
            onClick={onCancelDelete}
          >
            Keep
          </button>
        </div>
      ) : (
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          <button
            type="button"
            className="text-[10px] font-semibold text-[var(--accent)]"
            onClick={onSave}
          >
            Photos
          </button>
          <button
            type="button"
            className="text-[10px] text-[var(--bad)]"
            onClick={onAskDelete}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  )
}
