import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Athlete } from '../../types'
import { createId } from '../../lib/storage'
import { mergeShapeTests, takeGuestGrades } from '../../lib/quizGrades'
import { profileRole } from '../../lib/profileRole'
import {
  displayPersonName,
  forgetQuizGuest,
  loadQuizGuests,
  loadStationDrafts,
  namesMatch,
  removeStationDraft,
  splitPersonName,
  upsertStationDraft,
  type HarderShape,
  type OpenShoulderHardness,
  type StationDraft,
  type StationStep,
} from '../../lib/classStation'

type Props = {
  athletes: Athlete[]
  onClose: () => void
  onSaveAthlete: (athlete: Athlete, mode: 'create' | 'update') => void
  onStartShapeTest: (athlete: Athlete) => void
}

const STEPS: StationStep[] = [
  'who',
  'parentPhone',
  'cartwheel',
  'harder',
  'shoulder',
  'photo',
  'done',
]

function emptyDraft(): StationDraft {
  return {
    id: createId('stn'),
    firstName: '',
    lastName: '',
    step: 'who',
    updatedAt: new Date().toISOString(),
  }
}

function stepIndex(step: StationStep): number {
  return Math.max(0, STEPS.indexOf(step))
}

export function ClassStation({ athletes, onClose, onSaveAthlete, onStartShapeTest }: Props) {
  const [draft, setDraft] = useState<StationDraft>(emptyDraft)
  const [drafts, setDrafts] = useState(loadStationDrafts)
  const [guests, setGuests] = useState(loadQuizGuests)
  const [whoMode, setWhoMode] = useState<'pick' | 'type'>('pick')
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [filter, setFilter] = useState('')

  const roster = useMemo(
    () => athletes.filter((a) => profileRole(a) === 'athlete' || !a.role),
    [athletes],
  )

  const q = filter.trim().toLowerCase()
  const visibleRoster = roster.filter((a) => !q || a.name.toLowerCase().includes(q))
  const visibleDrafts = drafts.filter((d) => {
    const name = displayPersonName(d.firstName, d.lastName).toLowerCase()
    return !q || name.includes(q)
  })
  const visibleGuests = guests.filter((g) => {
    const name = displayPersonName(g.firstName, g.lastName).toLowerCase()
    const already = roster.some((a) => namesMatch(a, g.firstName, g.lastName))
    return !already && (!q || name.includes(q))
  })

  const persist = (next: StationDraft) => {
    const saved = { ...next, updatedAt: new Date().toISOString() }
    setDraft(saved)
    setDrafts(upsertStationDraft(saved))
    return saved
  }

  const go = (step: StationStep, patch: Partial<StationDraft> = {}) => {
    persist({ ...draft, ...patch, step })
  }

  const pickName = (firstName: string, lastName: string, athleteId?: string) => {
    const existing = athleteId
      ? athletes.find((a) => a.id === athleteId)
      : roster.find((a) => namesMatch(a, firstName, lastName))
    persist({
      ...draft,
      firstName,
      lastName,
      athleteId: existing?.id,
      parentPhone: draft.parentPhone || existing?.parentPhone,
      email: draft.email || existing?.email,
      phone: draft.phone || existing?.phone,
      cartwheelLeg: draft.cartwheelLeg || existing?.cartwheelLeg,
      harderShape: draft.harderShape || existing?.harderShape,
      openShoulderHardness: draft.openShoulderHardness ?? existing?.openShoulderHardness,
      step: 'parentPhone',
    })
  }

  const commitAthlete = (): Athlete => {
    const name = displayPersonName(draft.firstName, draft.lastName)
    const existing =
      (draft.athleteId ? athletes.find((a) => a.id === draft.athleteId) : undefined) ??
      roster.find((a) => namesMatch(a, draft.firstName, draft.lastName))
    const athlete: Athlete = {
      id: existing?.id ?? createId('ath'),
      name,
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      parentPhone: draft.parentPhone,
      email: draft.email || existing?.email,
      phone: draft.phone || existing?.phone,
      cartwheelLeg: draft.cartwheelLeg,
      harderShape: draft.harderShape,
      openShoulderHardness: draft.openShoulderHardness,
      role: existing?.role ?? 'athlete',
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      notes: existing?.notes,
      gymName: existing?.gymName,
      instagramHandle: existing?.instagramHandle,
      passcodeHash: existing?.passcodeHash,
      hasBackPain: existing?.hasBackPain,
      injuryActive: existing?.injuryActive,
      photoDataUrl: draft.photoDataUrl || existing?.photoDataUrl,
      shapeTests: mergeShapeTests(
        existing?.shapeTests,
        takeGuestGrades(draft.firstName, draft.lastName),
      ),
    }
    onSaveAthlete(athlete, existing ? 'update' : 'create')
    setGuests(forgetQuizGuest(draft.firstName, draft.lastName))
    return athlete
  }

  const idx = stepIndex(draft.step)
  const progress = `${idx + 1} / ${STEPS.length}`

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#07110e] text-[var(--text)]">
      <header className="flex items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Class station · {progress}
          </p>
          <p className="text-sm text-white/60">
            {draft.firstName
              ? displayPersonName(draft.firstName, draft.lastName)
              : 'One question at a time'}
          </p>
        </div>
        <div className="flex gap-2">
          {draft.step !== 'who' && (
            <button
              type="button"
              onClick={() => {
                persist(draft)
                onClose()
              }}
              className="rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold"
            >
              Finish later
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col justify-center px-4 pb-10">
        {draft.step === 'who' && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Who is this?</h2>
              <p className="mt-2 text-sm text-white/65">
                Pick a name from last cycle, or type first and last so we do
                not mix two kids up.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setWhoMode('pick')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  whoMode === 'pick' ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-white/10'
                }`}
              >
                Pick a name
              </button>
              <button
                type="button"
                onClick={() => setWhoMode('type')}
                className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold ${
                  whoMode === 'type' ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-white/10'
                }`}
              >
                New name
              </button>
            </div>

            {whoMode === 'pick' ? (
              <>
                <input
                  className="h-12 rounded-xl border border-white/10 bg-black/30 px-3"
                  placeholder="Search a name…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
                <div className="max-h-[50vh] space-y-2 overflow-y-auto">
                  {visibleDrafts.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDraft(d)}
                      className="flex w-full items-center justify-between rounded-2xl border border-[var(--accent)]/40 bg-[#102820] px-4 py-3 text-left"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
                          Finish later
                        </span>
                        <span className="text-lg font-semibold">
                          {displayPersonName(d.firstName, d.lastName)}
                        </span>
                      </span>
                      <span className="text-xs text-white/50">Continue</span>
                    </button>
                  ))}
                  {visibleGuests.map((g) => (
                    <button
                      key={`${g.firstName}-${g.lastName}`}
                      type="button"
                      onClick={() => pickName(g.firstName, g.lastName)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left"
                    >
                      <span>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-white/45">
                          Took the shape test
                        </span>
                        <span className="text-lg font-semibold">
                          {displayPersonName(g.firstName, g.lastName)}
                        </span>
                      </span>
                      <span className="text-xs text-white/50">Use name</span>
                    </button>
                  ))}
                  {visibleRoster.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        const parts = splitPersonName(a.name)
                        pickName(a.firstName || parts.firstName, a.lastName || parts.lastName, a.id)
                      }}
                      className="flex w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-lg font-semibold"
                    >
                      {a.name}
                    </button>
                  ))}
                  {visibleDrafts.length + visibleGuests.length + visibleRoster.length === 0 && (
                    <p className="text-sm text-white/55">No names yet. Type a new one.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3">
                <input
                  autoFocus
                  className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
                  placeholder="First name"
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                />
                <input
                  className="h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
                  placeholder="Last name"
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                />
                <button
                  type="button"
                  disabled={!first.trim() || !last.trim()}
                  onClick={() => pickName(first.trim(), last.trim())}
                  className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}

        {draft.step === 'parentPhone' && (
          <Question
            title="Mom or dad’s phone"
            hint="So we can tell the right parent whose kid this is."
            onBack={() => go('who')}
          >
            <input
              autoFocus
              inputMode="tel"
              className="h-14 w-full rounded-2xl border border-white/10 bg-black/30 px-4 text-lg"
              placeholder="Parent phone"
              value={draft.parentPhone ?? ''}
              onChange={(e) => persist({ ...draft, parentPhone: e.target.value })}
            />
            <button
              type="button"
              disabled={!draft.parentPhone?.trim()}
              onClick={() => go('cartwheel')}
              className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f] disabled:opacity-40"
            >
              Next
            </button>
          </Question>
        )}

        {draft.step === 'cartwheel' && (
          <Question
            title="Which way do you cartwheel?"
            hint="Which leg goes forward."
            onBack={() => go('parentPhone')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['left', 'Left leg forward'],
                  ['right', 'Right leg forward'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go('harder', { cartwheelLeg: id })}
                  className="h-20 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'harder' && (
          <Question
            title="Which one is harder?"
            hint="Hollow or Superman — tap the one that feels tougher."
            onBack={() => go('cartwheel')}
          >
            <div className="grid gap-3">
              {(
                [
                  ['hollow', 'Hollow'],
                  ['superman', 'Superman'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => go('shoulder', { harderShape: id as HarderShape })}
                  className="h-20 rounded-2xl bg-white/8 text-xl font-semibold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {label}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'shoulder' && (
          <Question
            title="How hard is a fully open shoulder?"
            hint="1 is easy. 5 is “I cannot get there yet.”"
            onBack={() => go('harder')}
          >
            <div className="grid grid-cols-5 gap-2">
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => go('photo', { openShoulderHardness: n as OpenShoulderHardness })}
                  className="h-20 rounded-2xl bg-white/8 text-2xl font-bold hover:bg-[var(--accent)] hover:text-[#06281f]"
                >
                  {n}
                </button>
              ))}
            </div>
          </Question>
        )}

        {draft.step === 'photo' && (
          <Question
            title="Quick snapshot?"
            hint="Optional. Opens this iPad’s camera so we can tell two kids with the same first name apart."
            onBack={() => go('shoulder')}
          >
            <StationSnapshot
              photoDataUrl={draft.photoDataUrl}
              onCapture={(photoDataUrl) => persist({ ...draft, photoDataUrl })}
            />
            <button
              type="button"
              onClick={() => go('done')}
              className="h-14 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
            >
              {draft.photoDataUrl ? 'Use this photo' : 'Skip'}
            </button>
          </Question>
        )}

        {draft.step === 'done' && (
          <div className="flex flex-col gap-4">
            <h2 className="text-3xl font-bold tracking-tight">
              {displayPersonName(draft.firstName, draft.lastName)} is ready
            </h2>
            <p className="text-sm text-white/65">
              Start the shape test now, or leave this name on Finish later for
              the next cycle.
            </p>
            <button
              type="button"
              onClick={() => {
                const athlete = commitAthlete()
                setDrafts(removeStationDraft(draft.id))
                onStartShapeTest(athlete)
              }}
              className="h-16 rounded-2xl bg-[var(--accent)] text-lg font-bold text-[#06281f]"
            >
              Start shape test
            </button>
            <button
              type="button"
              onClick={() => {
                persist({ ...draft, step: 'done' })
                onClose()
              }}
              className="h-14 rounded-2xl border border-white/15 text-base font-semibold"
            >
              Finish later
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Question({
  title,
  hint,
  onBack,
  children,
}: {
  title: string
  hint: string
  onBack: () => void
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-2 text-sm text-white/65">{hint}</p>
      </div>
      {children}
      <button type="button" onClick={onBack} className="self-start text-sm text-white/50 underline">
        Back
      </button>
    </div>
  )
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission was blocked. Allow the camera, then try again.'
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device.'
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is already in use. Close the other camera view and try again.'
  }
  if (name === 'SecurityError') {
    return 'This page needs HTTPS (or localhost) before the camera can open.'
  }
  return err instanceof Error ? err.message : 'Could not open the camera.'
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

function StationSnapshot({
  photoDataUrl,
  onCapture,
}: {
  photoDataUrl?: string
  onCapture: (dataUrl: string) => void
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [live, setLive] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!live || !streamRef.current) return
    const video = videoRef.current
    if (!video) return
    video.srcObject = streamRef.current
    void video
      .play()
      .then(() => setReady(true))
      .catch((err) => setError(cameraErrorMessage(err)))
  }, [live])

  const openCamera = async () => {
    setError(null)
    setBusy(true)
    setReady(false)
    try {
      stopStream(streamRef.current)
      streamRef.current = null
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 1280 },
        },
      })
      streamRef.current = stream
      setLive(true)
    } catch (err) {
      setLive(false)
      setReady(false)
      setError(cameraErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const snap = () => {
    const video = videoRef.current
    if (!video || video.videoWidth < 2) {
      setError('Wait for the preview, then tap Capture.')
      return
    }
    const size = Math.min(video.videoWidth, video.videoHeight)
    const sx = (video.videoWidth - size) / 2
    const sy = (video.videoHeight - size) / 2
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 640
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, sx, sy, size, size, 0, 0, 640, 640)
    onCapture(canvas.toDataURL('image/jpeg', 0.86))
    stopStream(streamRef.current)
    streamRef.current = null
    setLive(false)
    setReady(false)
  }

  return (
    <div className="flex flex-col gap-3">
      {photoDataUrl && !live ? (
        <img
          src={photoDataUrl}
          alt=""
          className="mx-auto h-40 w-40 rounded-full object-cover"
        />
      ) : live ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="mx-auto h-56 w-56 rounded-full bg-black object-cover"
        />
      ) : (
        <p className="text-sm text-white/55">Skip if the line is moving.</p>
      )}
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      {live ? (
        <button
          type="button"
          disabled={!ready}
          onClick={snap}
          className="h-14 rounded-2xl border border-white/15 text-base font-semibold disabled:opacity-40"
        >
          {ready ? 'Capture' : 'Opening camera…'}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void openCamera()}
          className="h-14 rounded-2xl border border-white/15 text-base font-semibold disabled:opacity-40"
        >
          {busy ? 'Opening camera…' : photoDataUrl ? 'Retake' : 'Open camera'}
        </button>
      )}
    </div>
  )
}
