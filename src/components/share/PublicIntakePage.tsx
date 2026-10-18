/**
 * Public athlete intake.
 *
 * Rendered standalone at /intake/<token> with NO sign-in. Three modes:
 *
 * - athlete: token tied to one athlete's profile (coach made it via
 *   quick-add). The athlete answers unanswered questions.
 * - open: general new-athlete link. They enter their name, answer all
 *   questions, optionally pick working-towards skills.
 * - group: new-athlete link tied to a training event. Same as open, but the
 *   new profile auto-joins that group.
 *
 * The per-athlete mode never searches the roster — the link only ever
 * touches that one profile.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { CORE_INTAKE, type IntakeQuestion } from '../../lib/intakeQuestions'
import { FAVORITE_COLORS } from '../../lib/profileTheme'
import { shippedFileList } from '../../lib/shippedRefs'
import { ProfilePhotoCropper } from '../today/ProfilePhotoCropper'
import { SkillMapView } from '../learn/SkillMapView'
import { AcroMapView } from '../learn/AcroMapView'
import type { UnifiedSkill } from '../../lib/skillRegistry'

type Mode = 'athlete' | 'open' | 'group'

function stillUrl(q: IntakeQuestion): string | null {
  if (q.stillFile) return `/references/${q.stillFile}`
  if (q.stillShapeId) {
    const files = shippedFileList(q.stillShapeId)
    if (files.length > 0) return `/references/${files[0]}`
  }
  return null
}

function QuestionView({
  q,
  value,
  onChange,
  photoDataUrl,
  onPhoto,
}: {
  q: IntakeQuestion
  value: string
  onChange: (v: string) => void
  photoDataUrl: string | null
  onPhoto: (dataUrl: string | null) => void
}) {
  const still = stillUrl(q)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  const pickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    setCropSrc(url)
    e.target.value = ''
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      {still && (
        <img
          src={still}
          alt=""
          className="mb-3 max-h-56 w-full rounded-xl object-contain bg-black/30"
        />
      )}
      <p className="text-base font-semibold text-white">{q.prompt}</p>
      {q.kind === 'color' ? (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {q.options!.map((o) => {
            const swatch = FAVORITE_COLORS.find((c) => c.id === o.value)?.swatch ?? '#888'
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => onChange(o.value)}
                className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${
                  value === o.value
                    ? 'border-sky-300 bg-sky-400/20'
                    : 'border-white/10 bg-white/5'
                }`}
              >
                <span
                  className="h-8 w-8 rounded-full border border-white/20"
                  style={{ background: swatch }}
                />
                <span className="text-[11px] font-semibold text-white/80">
                  {o.label}
                </span>
              </button>
            )
          })}
        </div>
      ) : q.kind === 'skip-phone' ? (
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="(optional)"
          className="mt-3 h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white"
        />
      ) : q.kind === 'photo' ? (
        <div className="mt-3">
          <p className="text-sm font-semibold text-amber-200">
            Make sure your face is easy to see in the picture.
          </p>
          {cropSrc ? (
            <div className="mt-3">
              <ProfilePhotoCropper
                src={cropSrc}
                onSave={(dataUrl) => {
                  onPhoto(dataUrl)
                  setCropSrc(null)
                }}
                onCancel={() => setCropSrc(null)}
              />
            </div>
          ) : photoDataUrl ? (
            <div className="mt-3 flex flex-col items-center gap-2">
              <img
                src={photoDataUrl}
                alt="Profile preview"
                className="h-32 w-32 rounded-full object-cover border-2 border-white/20"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-sm font-semibold text-sky-300"
              >
                Retake
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 flex h-24 w-full items-center justify-center rounded-xl border-2 border-dashed border-white/25 text-sm font-semibold text-white/70"
            >
              Take a photo or pick from library
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={pickFile}
            className="hidden"
          />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {q.options!.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-xl border px-3 py-2.5 text-sm font-semibold ${
                value === o.value
                  ? 'border-sky-300 bg-sky-400/20 text-white'
                  : 'border-white/15 bg-white/5 text-white/80'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Working-towards picker: the real skill maps, tap tiles to select up to 3. */
function WorkingTowardsPicker({
  value,
  onChange,
}: {
  value: string[]
  onChange: (v: string[]) => void
}) {
  const [map, setMap] = useState<'main' | 'acro'>('main')

  const toggle = (skill: UnifiedSkill) => {
    const id = skill.name
    if (value.includes(id)) onChange(value.filter((v) => v !== id))
    else if (value.length < 3) onChange([...value, id])
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-base font-semibold text-white">
        What skills are you working towards?
      </p>
      <p className="mt-1 text-sm text-white/50">
        Tap tiles on the map to pick up to 3. Skip this if you're not sure.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setMap('main')}
          className={`h-11 rounded-xl text-sm font-bold ${
            map === 'main'
              ? 'bg-sky-400 text-black'
              : 'border border-white/15 text-white/70'
          }`}
        >
          Main skill map
        </button>
        <button
          type="button"
          onClick={() => setMap('acro')}
          className={`h-11 rounded-xl text-sm font-bold ${
            map === 'acro'
              ? 'bg-sky-400 text-black'
              : 'border border-white/15 text-white/70'
          }`}
        >
          Acro map
        </button>
      </div>

      <p className="mt-3 text-xs text-white/50">
        {value.length}/3 selected
        {value.length > 0 && `: ${value.join(', ')}`}
      </p>
      <div className="mt-2 max-h-[50vh] overflow-y-auto rounded-xl border border-white/10">
        {map === 'main' ? (
          <SkillMapView
            onTileTap={toggle}
          />
        ) : (
          <AcroMapView onTileTap={toggle} />
        )}
      </div>
      {value.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="mt-2 text-sm font-semibold text-sky-300"
        >
          Clear selection
        </button>
      )}
    </div>
  )
}

export function PublicIntakePage({ token }: { token: string }) {
  const [loading, setLoading] = useState(true)
  const [invalid, setInvalid] = useState(false)
  const [mode, setMode] = useState<Mode>('athlete')
  const [coachName, setCoachName] = useState('')
  const [athleteName, setAthleteName] = useState('')
  const [groupName, setGroupName] = useState<string | null>(null)
  const [answeredIds, setAnsweredIds] = useState<string[]>([])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [qIndex, setQIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null)
  const [workingTowards, setWorkingTowards] = useState<string[]>([])
  const [step, setStep] = useState<'name' | 'questions' | 'towards'>('questions')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch(`/api/share/intake?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error('bad link')
        const data = await r.json()
        if (cancelled) return
        setMode((data.mode as Mode) ?? 'athlete')
        setCoachName(data.coachName ?? '')
        setAthleteName(data.athleteName ?? '')
        setGroupName(data.groupName ?? null)
        setAnsweredIds(data.answeredIds ?? [])
        if (data.mode === 'open' || data.mode === 'group') setStep('name')
      })
      .catch(() => {
        if (!cancelled) setInvalid(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const questions = useMemo(() => {
    const answered = new Set(answeredIds)
    // Include in-progress answers so conditional follow-ups (e.g. twistBetter
    // after answering "both") appear immediately.
    const current: Record<string, string> = { ...answers }
    return CORE_INTAKE.filter((q) => {
      if (answered.has(q.id)) return false
      if (q.showIf && !q.showIf(current)) return false
      return true
    })
  }, [answeredIds, answers])

  const submit = async () => {
    setSubmitting(true)
    setError('')
    try {
      const payload: any = {
        answers: questions
          .filter((q) => q.kind !== 'photo')
          .map((q) => ({ questionId: q.id, answer: answers[q.id] ?? '' })),
        workingTowards,
      }
      if (photoDataUrl) payload.photoDataUrl = photoDataUrl
      if (mode !== 'athlete') {
        payload.firstName = firstName.trim()
        payload.lastName = lastName.trim()
      }
      const r = await fetch(
        `/api/share/intake-submit?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (!r.ok) {
        const data = await r.json().catch(() => ({}))
        throw new Error(data.error ?? 'Could not save. Try again.')
      }
      setDone(true)
    } catch (e: any) {
      setError(e?.message ?? 'Could not save. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-white/60">Loading…</p>
      </div>
    )
  }

  if (invalid) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-center text-white/70">This link is invalid or expired.</p>
      </div>
    )
  }

  const heading =
    mode === 'group' && groupName
      ? `${groupName} sign-up`
      : mode === 'open'
        ? 'New athlete sign-up'
        : null

  const q = questions[qIndex]
  const last = qIndex >= questions.length - 1
  const isNew = mode !== 'athlete'

  return (
    <div className="min-h-dvh bg-[#0a1014] px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          {coachName} · Athlete intake
        </p>

        {done ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <h1 className="text-xl font-bold text-white">You're all set!</h1>
            <p className="mt-2 text-sm text-white/60">
              Your answers are saved. See you at the gym!
            </p>
          </div>
        ) : isNew && step === 'name' ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
            {heading && (
              <h1 className="text-xl font-bold text-white">{heading}</h1>
            )}
            <p className="mt-2 text-sm text-white/60">
              {mode === 'group'
                ? `You're signing up for ${groupName ?? 'the group'}. Start by telling us your name.`
                : 'Start by telling us your name.'}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                className="h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white placeholder:text-white/40"
              />
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                className="h-12 w-full rounded-xl border border-white/15 bg-black/40 px-3 text-white placeholder:text-white/40"
              />
            </div>
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            <button
              type="button"
              onClick={() => {
                if (!firstName.trim()) {
                  setError('Please enter your first name.')
                  return
                }
                setError('')
                setStep('questions')
              }}
              className="mt-4 h-12 w-full rounded-xl bg-sky-400 text-base font-bold text-black"
            >
              Continue
            </button>
          </div>
        ) : step === 'towards' ? (
          <div className="mt-6">
            <p className="mb-3 text-center text-sm text-white/50">
              Last step · optional
            </p>
            <WorkingTowardsPicker value={workingTowards} onChange={setWorkingTowards} />
            {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setStep('questions')}
                className="h-12 flex-1 rounded-xl border border-white/15 text-white font-semibold"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitting}
                className="h-12 flex-[2] rounded-xl bg-sky-400 text-base font-bold text-black disabled:opacity-40"
              >
                {submitting ? 'Saving…' : 'Finish'}
              </button>
            </div>
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
            <h1 className="text-xl font-bold text-white">
              Hi{athleteName ? ` ${athleteName.split(' ')[0]}` : ''}!
            </h1>
            <p className="mt-2 text-sm text-white/60">
              You've already answered everything. See you at the gym!
            </p>
          </div>
        ) : (
          q && (
            <div className="mt-6">
              {heading && (
                <h1 className="mb-1 text-center text-lg font-bold text-white">
                  {heading}
                </h1>
              )}
              {!isNew && (
                <h1 className="mb-1 text-center text-lg font-bold text-white">
                  Hi{athleteName ? ` ${athleteName.split(' ')[0]}` : ''}!
                </h1>
              )}
              <p className="mb-3 text-center text-sm text-white/50">
                Question {qIndex + 1} of {questions.length}
              </p>
              <QuestionView
                q={q}
                value={answers[q.id] ?? ''}
                onChange={(v) => setAnswers((s) => ({ ...s, [q.id]: v }))}
                photoDataUrl={photoDataUrl}
                onPhoto={setPhotoDataUrl}
              />
              {error && <p className="mt-2 text-sm text-red-300">{error}</p>}
              <div className="mt-4 flex gap-2">
                {qIndex > 0 && (
                  <button
                    type="button"
                    onClick={() => setQIndex(qIndex - 1)}
                    className="h-12 flex-1 rounded-xl border border-white/15 text-white font-semibold"
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (last) {
                      if (isNew) setStep('towards')
                      else void submit()
                    } else {
                      setQIndex(qIndex + 1)
                    }
                  }}
                  disabled={submitting}
                  className="h-12 flex-[2] rounded-xl bg-sky-400 text-base font-bold text-black disabled:opacity-40"
                >
                  {submitting ? 'Saving…' : last ? (isNew ? 'Next' : 'Save answers') : 'Next'}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default PublicIntakePage
