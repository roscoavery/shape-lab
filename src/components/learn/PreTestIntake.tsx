import { useState } from 'react'
import type { Athlete, ReferencePhoto } from '../../types'
import {
  applyIntakeField,
  handstandContest,
  pendingIntake,
  upsertIntakeAnswer,
} from '../../lib/intakeQuestions'
import { FAVORITE_COLORS } from '../../lib/profileTheme'
import { ReferenceStill } from '../ReferenceStill'
import { compressImageFile } from '../../lib/mediaCompress'
import { pushNotice } from '../../lib/notify'
import { findRyan } from '../../lib/ryanProfile'
import { publishTextPost } from '../../lib/feedPosts'

type Props = {
  athlete: Athlete
  athletes: Athlete[]
  photos: ReferencePhoto[]
  onSave: (next: Athlete) => void
  onDone: (next: Athlete) => void
  onPark?: (next: Athlete) => void
}

export function PreTestIntake({ athlete, athletes, photos, onSave, onDone, onPark }: Props) {
  const pending = pendingIntake(athlete)
  const [index, setIndex] = useState(0)
  const [phone, setPhone] = useState(athlete.parentPhone || '')
  const q = pending[index]

  const parkNow = (from: Athlete = athlete) => {
    let next = from
    if (q?.kind === 'skip-phone' && phone.trim()) {
      next = applyIntakeField(from, 'parentPhone', phone.trim())
      next = upsertIntakeAnswer(next, {
        questionId: q.id,
        prompt: q.prompt,
        answer: phone.trim(),
        askedAt: new Date().toISOString(),
      })
      onSave(next)
    }
    onPark?.(next)
  }

  if (!q) {
    return (
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <h3 className="text-xl font-semibold">Ready for the shape test</h3>
          {onPark && (
            <button
              type="button"
              onClick={() => parkNow(athlete)}
              className="shrink-0 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
            >
              Finish later
            </button>
          )}
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">Pictures first — name what you see.</p>
        <button
          type="button"
          onClick={() => onDone(athlete)}
          className="mt-4 rounded-xl bg-[var(--accent)] px-4 py-3 text-sm font-bold text-[#06281f]"
        >
          Start the pictures test
        </button>
      </section>
    )
  }

  const finishQuestion = (next: Athlete) => {
    onSave(next)
    if (index + 1 >= pending.length) onDone(next)
    else setIndex((i) => i + 1)
  }

  const answer = async (value: string, label?: string) => {
    let next =
      q.id === 'photo'
        ? { ...athlete, photoDataUrl: value || athlete.photoDataUrl }
        : applyIntakeField(athlete, coreFieldId(q.id), value)
    next = upsertIntakeAnswer(next, {
      questionId: q.id,
      prompt: q.prompt,
      answer: label || value,
      askedAt: new Date().toISOString(),
    })
    if (q.id === 'vUps' && value === 'over_30') {
      const ryan = findRyan(athletes)
      if (ryan) {
        void pushNotice({
          toId: ryan.id,
          kind: 'prove',
          title: `${next.name} said over 30 V-ups`,
          body: 'They have to prove it to Coach Ryan.',
          href: 'history',
        })
      }
    }
    if (handstandContest(next) && !handstandContest(athlete)) {
      void publishTextPost({
        authorId: next.id,
        caption: 'Handstand contest anyone?',
        taggedIds: [],
        channels: ['wins'],
      })
    }
    finishQuestion(next)
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
      <div className="mb-1 flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
          Before the test · {index + 1} / {pending.length}
        </p>
        {onPark && (
          <button
            type="button"
            onClick={() => parkNow()}
            className="shrink-0 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold text-[var(--text)]"
          >
            Finish later
          </button>
        )}
      </div>
      <h3 className="mt-1 text-xl font-semibold">{q.prompt}</h3>
      {q.stillShapeId && (
        <div className="mt-4 overflow-hidden rounded-xl bg-[#0d1218]">
          <ReferenceStill
            shapeId={q.stillShapeId}
            photos={photos}
            alt=""
            className="max-h-64 w-full object-contain"
          />
        </div>
      )}
      {q.kind === 'skip-phone' && (
        <div className="mt-4 space-y-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="Parent phone"
            className="h-12 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!phone.trim()}
              onClick={() => void answer(phone.trim(), phone.trim())}
              className="h-12 flex-1 rounded-xl bg-[var(--accent)] font-bold text-[#06281f] disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => void answer('', 'Skipped')}
              className="h-12 rounded-xl px-4 text-sm text-[var(--muted)]"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
      {q.kind === 'photo' && (
        <div className="mt-4 space-y-2">
          <label className="block rounded-xl bg-[var(--accent)] px-4 py-3 text-center text-sm font-bold text-[#06281f]">
            Take or pick a photo
            <input
              type="file"
              accept="image/*"
              capture="user"
              className="sr-only"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                if (!f) return
                const url = await compressImageFile(f)
                void answer(url, 'Photo added')
              }}
            />
          </label>
          <button
            type="button"
            onClick={() => void answer('', 'Skipped')}
            className="text-sm text-[var(--muted)]"
          >
            Skip for now
          </button>
        </div>
      )}
      {q.kind === 'color' && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {FAVORITE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => void answer(c.id, c.label)}
              className="flex items-center gap-2 rounded-xl bg-[#0d1218] px-3 py-3 text-left text-sm font-semibold"
            >
              <span className="h-4 w-4 rounded-full" style={{ background: c.swatch }} />
              {c.label}
            </button>
          ))}
        </div>
      )}
      {q.kind === 'choice' && q.options && (
        <div className="mt-4 grid gap-2">
          {q.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => void answer(opt.value, opt.label)}
              className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-4 py-3 text-left text-sm font-semibold hover:border-[var(--accent-dim)]"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
      {q.id === 'vUps' && (
        <p className="mt-3 text-xs text-[var(--muted)]">
          Over 30 means you have to prove it to Coach Ryan.
        </p>
      )}
    </section>
  )
}

function coreFieldId(id: string): string {
  return id.replace(/_20\d{2}-W\d{2}$/, '')
}
