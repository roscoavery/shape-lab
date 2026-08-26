/**
 * Shape glossary — one coach photo per practiced shape, plus an Extra folder
 * for positions that are learned here and not scored on camera.
 */

import { useEffect, useMemo, useState } from 'react'
import { getShape } from '../config/shapes'
import {
  builtinExtraShapes,
  hasCoachReference,
  missingCoachReferences,
  neededShotList,
  pickCoachReference,
} from '../lib/referenceNeeds'
import {
  blobToDataUrl,
  deleteExtraShape,
  fileToJpegBlob,
  getExtraShapeBlob,
  listExtraShapes,
  saveExtraShape,
  type ExtraShape,
} from '../lib/glossaryStore'
import { createId, saveReferencePhoto } from '../lib/storage'
import type { ReferencePhoto } from '../types'

type Folder = 'needed' | 'practice' | 'extra'

type Props = {
  referencePhotos: ReferencePhoto[]
  onReferencesChange: (photos: ReferencePhoto[]) => void
}

export function ShapeGlossary({ referencePhotos, onReferencesChange }: Props) {
  const [folder, setFolder] = useState<Folder>('needed')
  const [flash, setFlash] = useState<string | null>(null)
  const [extras, setExtras] = useState<ExtraShape[]>([])
  const [extraUrls, setExtraUrls] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)

  const missing = useMemo(() => missingCoachReferences(referencePhotos), [referencePhotos])
  const shots = useMemo(() => neededShotList(), [])
  const builtinExtra = useMemo(() => builtinExtraShapes(), [])

  const reloadExtras = async () => {
    try {
      const list = await listExtraShapes()
      setExtras(list)
      const urls: Record<string, string> = {}
      for (const e of list) {
        const blob = await getExtraShapeBlob(e.id)
        if (blob) urls[e.id] = URL.createObjectURL(blob)
      }
      setExtraUrls((prev) => {
        for (const u of Object.values(prev)) URL.revokeObjectURL(u)
        return urls
      })
    } catch {
      setExtras([])
    }
  }

  useEffect(() => {
    void reloadExtras()
    return () => {
      setExtraUrls((prev) => {
        for (const u of Object.values(prev)) URL.revokeObjectURL(u)
        return {}
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const uploadForShape = async (shapeId: string, file: File, notes: string) => {
    const jpeg = await fileToJpegBlob(file)
    const dataUrl = await blobToDataUrl(jpeg)
    const shape = getShape(shapeId)
    const photo: ReferencePhoto = {
      id: createId('ref'),
      shapeId,
      athleteId: null,
      dataUrl,
      label: shape?.name ?? shapeId,
      notes: notes.trim() || undefined,
      createdAt: new Date().toISOString(),
    }
    await saveReferencePhoto(photo)
    onReferencesChange([
      photo,
      ...referencePhotos.filter((p) => !(p.shapeId === shapeId && p.athleteId == null)),
    ])
    setFlash(`Saved reference for ${shape?.name ?? shapeId}`)
    window.setTimeout(() => setFlash(null), 2500)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Shape glossary</p>
        <h3 className="mt-1 text-xl font-semibold">One clear picture per shape</h3>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Upload a single coach still for each practiced shape (with any extra notes). Extra
          shapes you will not score on camera live in their own folder — add a photo and write
          what you want athletes to know.
        </p>
        <p className="mt-2 text-sm">
          <span className="font-semibold text-[var(--accent)]">{missing.length}</span>
          <span className="text-[var(--muted)]"> still need a stored reference.</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-[var(--panel-border)] bg-[#121820] p-1">
          {(
            [
              ['needed', `Need photos (${missing.length})`],
              ['practice', 'Practiced shapes'],
              ['extra', `Extra shapes (${builtinExtra.length + extras.length})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFolder(id)}
              className={`rounded-md px-3 py-1.5 text-sm ${
                folder === id
                  ? 'bg-[var(--accent-dim)] font-semibold text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {flash && (
        <p className="rounded-lg border border-[var(--accent)]/30 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {flash}
        </p>
      )}

      {folder === 'needed' && (
        <NeededList
          missing={missing}
          onUpload={uploadForShape}
        />
      )}

      {folder === 'practice' && (
        <PracticeGrid
          shots={shots}
          photos={referencePhotos}
          openId={openId}
          onOpen={setOpenId}
          onUpload={uploadForShape}
        />
      )}

      {folder === 'extra' && (
        <ExtraFolder
          builtin={builtinExtra}
          extras={extras}
          extraUrls={extraUrls}
          photos={referencePhotos}
          onUploadBuiltin={uploadForShape}
          onAdded={() => void reloadExtras()}
          onDeleted={() => void reloadExtras()}
        />
      )}
    </div>
  )
}

function NeededList({
  missing,
  onUpload,
}: {
  missing: ReturnType<typeof missingCoachReferences>
  onUpload: (shapeId: string, file: File, notes: string) => Promise<void>
}) {
  if (!missing.length) {
    return (
      <p className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 text-sm text-[var(--good)]">
        Every practiced shape has a stored coach photo. Replace any of them from Practiced
        shapes if you get a clearer still.
      </p>
    )
  }
  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <h4 className="mb-1 text-sm font-semibold">Please shoot these</h4>
      <p className="mb-3 text-xs text-[var(--muted)]">
        One photo each. Full body in frame. Use the view listed so athletes can match it.
      </p>
      <ol className="space-y-3">
        {missing.map((s, i) => (
          <li
            key={s.shapeId}
            className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-3"
          >
            <p className="text-sm font-semibold">
              {i + 1}. {s.name}{' '}
              <span className="text-[10px] font-normal uppercase tracking-wide text-[var(--muted)]">
                {s.group === 'homework' ? 'Homework' : 'Pathway'}
              </span>
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">{s.shoot}</p>
            <UploadFields
              key={s.shapeId}
              onSave={(file, notes) => onUpload(s.shapeId, file, notes)}
            />
          </li>
        ))}
      </ol>
    </section>
  )
}

function PracticeGrid({
  shots,
  photos,
  openId,
  onOpen,
  onUpload,
}: {
  shots: ReturnType<typeof neededShotList>
  photos: ReferencePhoto[]
  openId: string | null
  onOpen: (id: string | null) => void
  onUpload: (shapeId: string, file: File, notes: string) => Promise<void>
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {shots.map((s) => {
        const ref = pickCoachReference(photos, s.shapeId)
        const have = hasCoachReference(photos, s.shapeId)
        const open = openId === s.shapeId
        return (
          <li key={s.shapeId} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
            <button
              type="button"
              className="flex w-full gap-3 text-left"
              onClick={() => onOpen(open ? null : s.shapeId)}
            >
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-md bg-[#0d1218]">
                {have && ref ? (
                  <img src={ref.dataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-[var(--warn)]">
                    Need photo
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.name}</p>
                <p className="mt-1 line-clamp-3 text-[11px] text-[var(--muted)]">{s.shoot}</p>
              </div>
            </button>
            {open && (
              <div className="mt-3 border-t border-[var(--panel-border)] pt-3">
                {ref?.notes && (
                  <p className="mb-2 whitespace-pre-wrap text-sm">{ref.notes}</p>
                )}
                <UploadFields
                  key={s.shapeId}
                  existingNotes={ref?.notes ?? ''}
                  replace={have}
                  onSave={(file, notes) => onUpload(s.shapeId, file, notes)}
                />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function ExtraFolder({
  builtin,
  extras,
  extraUrls,
  photos,
  onUploadBuiltin,
  onAdded,
  onDeleted,
}: {
  builtin: ReturnType<typeof builtinExtraShapes>
  extras: ExtraShape[]
  extraUrls: Record<string, string>
  photos: ReferencePhoto[]
  onUploadBuiltin: (shapeId: string, file: File, notes: string) => Promise<void>
  onAdded: () => void
  onDeleted: () => void
}) {
  return (
    <div className="space-y-4">
      <AddExtraForm onSaved={onAdded} />

      {extras.length > 0 && (
        <section>
          <h4 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
            Added by you
          </h4>
          <ul className="grid gap-3 sm:grid-cols-2">
            {extras.map((e) => (
              <li key={e.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
                {extraUrls[e.id] && (
                  <img
                    src={extraUrls[e.id]}
                    alt={e.name}
                    className="mb-2 max-h-48 w-full rounded-md object-contain bg-[#0d1218]"
                  />
                )}
                <p className="font-semibold">{e.name}</p>
                {e.cameraHint && (
                  <p className="mt-1 text-[11px] text-[var(--accent)]">{e.cameraHint}</p>
                )}
                {e.bodyPosition && (
                  <p className="mt-2 text-sm leading-relaxed">{e.bodyPosition}</p>
                )}
                {e.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--muted)]">{e.notes}</p>
                )}
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--bad)]"
                  onClick={async () => {
                    await deleteExtraShape(e.id)
                    onDeleted()
                  }}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4 className="mb-2 text-xs uppercase tracking-wider text-[var(--muted)]">
          Library extras (not scored in Tasks)
        </h4>
        <p className="mb-3 text-xs text-[var(--muted)]">
          These exist in the shape library for learning only. Attach a photo and notes the same
          way — they will not appear as camera tasks.
        </p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {builtin.map((s) => {
            const ref = pickCoachReference(photos, s.id)
            return (
              <li key={s.id} className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-3">
                <p className="font-semibold">{s.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">{s.description}</p>
                {ref && (
                  <img
                    src={ref.dataUrl}
                    alt=""
                    className="mt-2 max-h-40 w-full rounded-md object-contain bg-[#0d1218]"
                  />
                )}
                {ref?.notes && (
                  <p className="mt-2 whitespace-pre-wrap text-sm">{ref.notes}</p>
                )}
                <UploadFields
                  key={s.id}
                  existingNotes={ref?.notes ?? ''}
                  replace={Boolean(ref)}
                  onSave={(file, notes) => onUploadBuiltin(s.id, file, notes)}
                />
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function UploadFields({
  onSave,
  existingNotes = '',
  replace = false,
}: {
  onSave: (file: File, notes: string) => Promise<void>
  existingNotes?: string
  replace?: boolean
}) {
  const [notes, setNotes] = useState(existingNotes)
  const [busy, setBusy] = useState(false)

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        placeholder="Extra info for this picture (cues, what to look for, common mistakes…)"
        className="w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1.5 text-sm"
      />
      <label className="inline-block cursor-pointer rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-xs hover:bg-[#243040]">
        {busy ? 'Saving…' : replace ? 'Replace photo' : 'Upload photo'}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (!file) return
            setBusy(true)
            void onSave(file, notes).finally(() => setBusy(false))
          }}
        />
      </label>
    </div>
  )
}

function AddExtraForm({ onSaved }: { onSaved: () => void }) {
  const [name, setName] = useState('')
  const [cameraHint, setCameraHint] = useState('')
  const [bodyPosition, setBodyPosition] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  return (
    <section className="rounded-xl border border-dashed border-[var(--accent)]/40 bg-[var(--panel)] p-5">
      <h4 className="text-sm font-semibold">Add an extra shape</h4>
      <p className="mt-1 text-xs text-[var(--muted)]">
        For positions you want in the glossary but will not practice with the camera. Photo +
        your notes are stored on this device.
      </p>
      <div className="mt-3 grid gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Shape name"
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <input
          value={cameraHint}
          onChange={(e) => setCameraHint(e.target.value)}
          placeholder="How to look at it (e.g. SIDE view, face the camera)"
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <textarea
          value={bodyPosition}
          onChange={(e) => setBodyPosition(e.target.value)}
          rows={2}
          placeholder="Body position — what the finished shape is"
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Extra info (cues, mistakes, when you teach it…)"
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
        />
        <label className="inline-block cursor-pointer rounded-lg bg-[var(--accent)] px-3 py-2 text-center text-sm font-semibold text-[#06281f]">
          {busy ? 'Saving…' : 'Choose photo and save'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy || !name.trim()}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file || !name.trim()) {
                setErr('Name and photo are required.')
                return
              }
              setErr(null)
              setBusy(true)
              void (async () => {
                try {
                  const jpeg = await fileToJpegBlob(file)
                  await saveExtraShape(
                    {
                      id: createId('extra'),
                      name: name.trim(),
                      notes: notes.trim(),
                      bodyPosition: bodyPosition.trim(),
                      cameraHint: cameraHint.trim(),
                      createdAt: new Date().toISOString(),
                    },
                    jpeg,
                  )
                  setName('')
                  setCameraHint('')
                  setBodyPosition('')
                  setNotes('')
                  onSaved()
                } catch {
                  setErr('Could not save that extra shape.')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          />
        </label>
        {err && <p className="text-xs text-[var(--bad)]">{err}</p>}
      </div>
    </section>
  )
}
