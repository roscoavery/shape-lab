import { useEffect, useRef, useState } from 'react'
import { formatSeconds } from '../../hooks/useHoldTimer'
import {
  deleteWarmupFromGym,
  emptyWarmup,
  hydrateCoachContent,
  isWarmupStarred,
  listWarmups,
  saveWarmupToGym,
  subscribeCoachContent,
  toggleWarmupStar,
  uploadCoachMedia,
} from '../../lib/coachContentStore'
import { compressImageFile } from '../../lib/mediaCompress'
import { createId } from '../../lib/storage'
import { isCoachProfile, isGymAdmin } from '../../lib/profileRole'
import type { Athlete, WarmupGuide, WarmupStep } from '../../types'
import { FramedPhoto } from '../coach/FramedPhoto'

type Props = {
  signedIn: Athlete | null
}

export function WarmupPanel({ signedIn }: Props) {
  const [tick, setTick] = useState(0)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [editing, setEditing] = useState<WarmupGuide | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [askDelete, setAskDelete] = useState<WarmupGuide | null>(null)
  const [deleting, setDeleting] = useState(false)
  const coach = Boolean(signedIn && isCoachProfile(signedIn))

  useEffect(() => subscribeCoachContent(() => setTick((n) => n + 1)), [])
  useEffect(() => {
    void hydrateCoachContent()
  }, [])
  void tick

  const all = listWarmups()
  const starred = signedIn
    ? all.filter((w) => isWarmupStarred(signedIn.id, w.id))
    : []
  const rest = signedIn ? all.filter((w) => !isWarmupStarred(signedIn.id, w.id)) : all
  const ordered = [...starred, ...rest]
  const active = ordered.find((w) => w.id === activeId) ?? null

  if (!signedIn) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h2 className="text-xl font-semibold">Warm-up</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Unlock a profile to pick a coach’s stretch or warm-up and be walked
          through it.
        </p>
      </section>
    )
  }

  if (active) {
    return (
      <WarmupPlayer
        guide={active}
        athleteId={signedIn.id}
        onBack={() => setActiveId(null)}
      />
    )
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Practice</p>
        <h2 className="text-xl font-semibold">Stretch and warm-up</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pick any coach’s warm-up. Star the ones you use most. Coaches upload
          the video or write the steps the way they run it in the gym.
        </p>
        {coach && (
          <button
            type="button"
            className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            onClick={() => setEditing(emptyWarmup(signedIn.id, signedIn.name))}
          >
            Write your warm-up
          </button>
        )}
      </section>

      {editing && (
        <WarmupEditor
          guide={editing}
          coachId={signedIn.id}
          existing={all.some((w) => w.id === editing.id)}
          onCancel={() => setEditing(null)}
          onSaved={(savedToGym) => {
            setEditing(null)
            setNotice(
              savedToGym
                ? 'Saved to this gym link. Every phone and iPad will see it.'
                : 'Saved on this device. The gym link did not take it — stay on this URL and save again.',
            )
          }}
          onError={setErr}
        />
      )}
      {err && <p className="text-sm text-[var(--bad)]">{err}</p>}
      {notice && <p className="text-sm text-[var(--accent)]">{notice}</p>}
      {askDelete && (
        <WarmupAsk
          title={`Are you sure you want to delete ${askDelete.title || 'this stretch'}?`}
          body="It comes off every phone and iPad on this gym link. This does not undo."
          keepLabel="Keep stretch"
          confirmLabel={deleting ? 'Deleting…' : 'Yes, delete'}
          busy={deleting}
          onKeep={() => setAskDelete(null)}
          onConfirm={() => {
            setDeleting(true)
            void deleteWarmupFromGym(askDelete.id).then((ok) => {
              setDeleting(false)
              setAskDelete(null)
              setNotice(
                ok
                  ? 'Deleted from this gym link.'
                  : 'Removed on this device. The gym link did not take it — stay on this URL and delete again.',
              )
            })
          }}
        />
      )}

      {ordered.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No warm-ups yet. A coach can add one here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {ordered.map((w) => {
            const star = isWarmupStarred(signedIn.id, w.id)
            const mine = w.coachId === signedIn.id
            const canDelete = mine || isGymAdmin(signedIn)
            return (
              <li
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold">{w.title || 'Untitled warm-up'}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {w.coachName} · {w.steps.length} steps
                    {star ? ' · starred' : ''}
                  </p>
                  {w.description && <p className="mt-1 text-sm">{w.description}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs underline"
                    onClick={() => toggleWarmupStar(signedIn.id, w.id)}
                  >
                    {star ? 'Unstar' : 'Star'}
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[var(--accent-dim)] px-2.5 py-1 text-xs font-semibold text-white"
                    onClick={() => setActiveId(w.id)}
                  >
                    Start
                  </button>
                  {mine && (
                    <button type="button" className="text-xs underline" onClick={() => setEditing(w)}>
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      className="text-xs text-[var(--bad)] underline"
                      onClick={() => setAskDelete(w)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function WarmupPlayer({
  guide,
  athleteId,
  onBack,
}: {
  guide: WarmupGuide
  athleteId: string
  onBack: () => void
}) {
  const [i, setI] = useState(0)
  const [running, setRunning] = useState(false)
  const [ms, setMs] = useState(0)
  const startRef = useRef<number | null>(null)
  const accRef = useRef(0)
  const step = guide.steps[i]
  const starred = isWarmupStarred(athleteId, guide.id)

  useEffect(() => {
    if (!running) return
    const id = window.setInterval(() => {
      const start = startRef.current
      if (start == null) return
      setMs(accRef.current + (performance.now() - start))
    }, 80)
    return () => window.clearInterval(id)
  }, [running])

  const resetClock = () => {
    startRef.current = running ? performance.now() : null
    accRef.current = 0
    setMs(0)
  }

  if (!step) {
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h2 className="text-xl font-semibold">{guide.title}</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">This warm-up has no steps yet.</p>
        <button type="button" className="mt-3 text-sm underline" onClick={onBack}>
          Back
        </button>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
        {guide.coachName} · step {i + 1} of {guide.steps.length}
      </p>
      <h2 className="text-xl font-semibold">{guide.title}</h2>
      <div className="mt-2 flex gap-3">
        <button type="button" className="text-xs underline" onClick={onBack}>
          All warm-ups
        </button>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => toggleWarmupStar(athleteId, guide.id)}
        >
          {starred ? 'Unstar' : 'Star this one'}
        </button>
      </div>
      <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
      {step.notes && <p className="mt-1 text-sm leading-relaxed">{step.notes}</p>}
      {step.mediaKind === 'photo' && step.mediaSrc && (
        <FramedPhoto src={step.mediaSrc} className="mt-3 max-h-72 w-full rounded-lg object-contain" />
      )}
      {step.mediaKind === 'video' && step.mediaSrc && (
        <video className="mt-3 w-full rounded-lg" src={step.mediaSrc} controls playsInline />
      )}
      <p className="mt-4 text-4xl font-black tabular-nums">
        {formatSeconds(ms / 1000)}
        {step.holdSeconds ? (
          <span className="ml-2 text-sm font-normal text-[var(--muted)]">
            target {step.holdSeconds}s
          </span>
        ) : null}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {!running ? (
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f]"
            onClick={() => {
              startRef.current = performance.now()
              setRunning(true)
            }}
          >
            Start
          </button>
        ) : (
          <button
            type="button"
            className="rounded-lg bg-[var(--warn)] px-3 py-2 text-sm font-semibold text-[#2a1c00]"
            onClick={() => {
              if (startRef.current != null) accRef.current += performance.now() - startRef.current
              startRef.current = null
              setRunning(false)
            }}
          >
            Stop
          </button>
        )}
        <button
          type="button"
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
          onClick={resetClock}
        >
          Reset
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={i === 0}
          className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm disabled:opacity-40"
          onClick={() => {
            setI((n) => n - 1)
            setRunning(false)
            accRef.current = 0
            startRef.current = null
            setMs(0)
          }}
        >
          Back
        </button>
        <button
          type="button"
          disabled={i >= guide.steps.length - 1}
          className="rounded-lg bg-[var(--accent-dim)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          onClick={() => {
            setI((n) => n + 1)
            setRunning(false)
            accRef.current = 0
            startRef.current = null
            setMs(0)
          }}
        >
          Next
        </button>
      </div>
    </section>
  )
}

function WarmupAsk({
  title,
  body,
  keepLabel,
  confirmLabel,
  busy,
  onKeep,
  onConfirm,
}: {
  title: string
  body: string
  keepLabel: string
  confirmLabel: string
  busy?: boolean
  onKeep: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[420] flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-2xl">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--bad)]">
          Stretch / warm-up
        </p>
        <h3 className="mt-1 text-lg font-semibold">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onKeep}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
          >
            {keepLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-lg border border-[var(--bad)] px-4 py-2 text-sm font-semibold text-[var(--bad)] disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function WarmupEditor({
  guide,
  coachId,
  existing,
  onCancel,
  onSaved,
  onError,
}: {
  guide: WarmupGuide
  coachId: string
  existing: boolean
  onCancel: () => void
  onSaved: (savedToGym: boolean) => void
  onError: (msg: string | null) => void
}) {
  const [draft, setDraft] = useState(guide)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [askSave, setAskSave] = useState(false)

  const setStep = (id: string, patch: Partial<WarmupStep>) => {
    setDraft({
      ...draft,
      steps: draft.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    })
  }

  const addMedia = async (stepId: string, file: File) => {
    setBusy(true)
    onError(null)
    try {
      if (file.type.startsWith('image/')) {
        const src = await compressImageFile(file)
        setStep(stepId, { mediaKind: 'photo', mediaSrc: src })
      } else {
        const src = await uploadCoachMedia({ ownerId: coachId, file, name: file.name })
        setStep(stepId, { mediaKind: 'video', mediaSrc: src })
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save that file.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--accent)]/35 bg-[var(--panel)] p-4">
      <h3 className="font-semibold">Your warm-up</h3>
      <div className="mt-3 flex flex-col gap-2">
        <input
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          placeholder="Name (Ryan stretch, Levi warm-up…)"
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
        />
        <textarea
          className="rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm"
          rows={2}
          placeholder="When to use it"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
        {draft.steps.map((s, i) => (
          <div key={s.id} className="rounded-lg bg-[#121820] p-3">
            <p className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Step {i + 1}</p>
            <input
              className="mt-1 w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-sm"
              placeholder="What they do"
              value={s.title}
              onChange={(e) => setStep(s.id, { title: e.target.value })}
            />
            <textarea
              className="mt-1 w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-sm"
              rows={2}
              placeholder="How you want them to feel it"
              value={s.notes}
              onChange={(e) => setStep(s.id, { notes: e.target.value })}
            />
            <input
              className="mt-1 w-full rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-sm"
              placeholder="Hold seconds (optional)"
              inputMode="numeric"
              value={s.holdSeconds ?? ''}
              onChange={(e) =>
                setStep(s.id, {
                  holdSeconds: e.target.value ? Number(e.target.value) || undefined : undefined,
                })
              }
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <label className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-xs">
                Picture or video
                <input
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  disabled={busy}
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) void addMedia(s.id, f)
                    e.target.value = ''
                  }}
                />
              </label>
              <input
                className="min-w-[10rem] flex-1 rounded-md border border-[var(--panel-border)] bg-[#0d1218] px-2 py-1 text-xs"
                placeholder="Or paste a video URL and press Enter"
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  const v = (e.target as HTMLInputElement).value.trim()
                  if (v) setStep(s.id, { mediaKind: 'video', mediaSrc: v })
                  ;(e.target as HTMLInputElement).value = ''
                }}
              />
              <button
                type="button"
                className="text-xs text-[var(--bad)] underline"
                onClick={() => setDraft({ ...draft, steps: draft.steps.filter((x) => x.id !== s.id) })}
              >
                Remove
              </button>
            </div>
            {s.mediaKind === 'photo' && s.mediaSrc && (
              <FramedPhoto src={s.mediaSrc} className="mt-2 max-h-40 w-full object-contain" />
            )}
            {s.mediaKind === 'video' && s.mediaSrc && (
              <video className="mt-2 max-h-40 w-full" src={s.mediaSrc} controls playsInline />
            )}
          </div>
        ))}
        <button
          type="button"
          className="self-start text-xs underline"
          onClick={() =>
            setDraft({
              ...draft,
              steps: [...draft.steps, { id: createId('wst'), title: '', notes: '' }],
            })
          }
        >
          Add a step
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!draft.title.trim() || draft.steps.length === 0 || busy || saving}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-40"
            onClick={() => setAskSave(true)}
          >
            Save warm-up
          </button>
          <button type="button" className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
      {askSave && (
        <WarmupAsk
          title={
            existing
              ? `Are you sure you want to save these changes to ${draft.title.trim() || 'this stretch'}?`
              : `Are you sure you want to save ${draft.title.trim() || 'this stretch'} to the gym link?`
          }
          body={
            existing
              ? 'Every phone and iPad on this gym link gets the update. This does not undo.'
              : 'Every phone and iPad on this gym link will see it.'
          }
          keepLabel={existing ? 'Keep editing' : 'Keep writing'}
          confirmLabel={saving ? 'Saving…' : 'Yes, save'}
          busy={saving}
          onKeep={() => setAskSave(false)}
          onConfirm={() => {
            setSaving(true)
            onError(null)
            void saveWarmupToGym({ ...draft, title: draft.title.trim() }).then(({ savedToGym }) => {
              setSaving(false)
              setAskSave(false)
              onSaved(savedToGym)
            })
          }}
        />
      )}
    </section>
  )
}
