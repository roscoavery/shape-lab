import { useMemo, useState } from 'react'
import type { HomeworkItem, HomeworkLog, HomeworkTrackMode } from '../../types'
import { getCatalogItem, PULLUP_GRIPS } from '../../config/homeworkCatalog'
import { homeworkTitle } from '../../lib/homeworkLabel'
import { shouldEncourageSlowReps } from '../../lib/backCare'

type Props = {
  item: HomeworkItem
  logs: HomeworkLog[]
  onLog: (input: {
    reps: number
    qualityReps: number
    holdSeconds?: number
    grip?: string
    weightLb?: number
    painLevel?: number
    journal?: string
    trackMode: HomeworkTrackMode
  }) => void
  onDone: () => void
}

export function RepSession({ item, logs, onLog, onDone }: Props) {
  const cat = getCatalogItem(item.catalogId ?? item.shapeId)
  const mode = item.trackMode ?? cat?.trackMode ?? 'reps'
  const allowHold = mode === 'hold' || mode === 'hold_or_reps'
  const allowReps = mode === 'reps' || mode === 'hold_or_reps'
  const [reps, setReps] = useState(String(item.targetReps ?? cat?.targetReps ?? ''))
  const [quality, setQuality] = useState('')
  const [holdSec, setHoldSec] = useState('')
  const [grip, setGrip] = useState(item.grip ?? '')
  const [weight, setWeight] = useState('')
  const [pain, setPain] = useState('')
  const [journal, setJournal] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const last = logs[0]
  const bestHold = useMemo(
    () => logs.reduce((best, l) => Math.max(best, l.totalHoldSeconds || 0), 0),
    [logs],
  )
  const isBackExt = cat?.id === 'back_extension'
  const painFreeTwoMin = logs.some(
    (l) =>
      (l.totalHoldSeconds ?? 0) >= 120 && (l.painLevel == null || l.painLevel === 0),
  )

  const save = () => {
    if (saving) return
    const r = Number(reps)
    const q = quality === '' ? r : Number(quality)
    const hold = holdSec === '' ? undefined : Number(holdSec)
    const w = weight === '' ? undefined : Number(weight)
    const p = pain === '' ? undefined : Number(pain)
    const hasHold = hold != null && Number.isFinite(hold) && hold > 0
    const hasReps = Number.isFinite(r) && r > 0
    if (allowHold && allowReps) {
      if (!hasHold && !hasReps) {
        setError('Enter a hold, reps, or both for this set.')
        return
      }
    } else if (allowHold && !hasHold) {
      setError('Enter hold seconds.')
      return
    } else if (allowReps && !hasReps) {
      setError('Enter how many reps you did.')
      return
    }
    if (hasReps && quality !== '' && (!Number.isFinite(q) || q < 0)) {
      setError('Quality reps has to be a number.')
      return
    }
    setError(null)
    setSaving(true)
    onLog({
      reps: hasReps ? r : 0,
      qualityReps: hasReps && Number.isFinite(q) ? Math.min(q, r || q) : 0,
      holdSeconds: hasHold ? hold : undefined,
      grip: grip || undefined,
      weightLb: w != null && Number.isFinite(w) ? w : undefined,
      painLevel: p != null && Number.isFinite(p) ? Math.min(10, Math.max(0, p)) : undefined,
      journal: journal.trim() || undefined,
      trackMode: hasHold && hasReps ? 'hold_or_reps' : hasHold ? 'hold' : 'reps',
    })
    setHoldSec('')
    window.setTimeout(() => setSaving(false), 1200)
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Log a set
        </p>
        <h3 className="text-lg font-semibold text-[var(--text)]">{homeworkTitle(item)}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {allowHold && allowReps
            ? 'One set can be a hold, reps, or both — for example 2 minutes then 5 reps.'
            : (cat?.notes ??
              item.notes ??
              'Count the reps you would show a coach, then the ones that were quality.')}
        </p>
      </div>

      {isBackExt && (
        <div className="rounded-lg border border-[var(--warn)]/40 bg-[#2a2312] px-3 py-2 text-sm text-[var(--text)]">
          <p className="font-semibold text-[var(--warn)]">Back extensions</p>
          <p className="mt-1 text-[var(--muted)]">
            The usual path is a 2-minute pain-free hold before lots of reps.
            If you already know a short set is safe, log the hold and the reps
            you actually did. This is a record, not a lock.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Best hold on file: {bestHold > 0 ? `${bestHold.toFixed(0)}s` : 'none yet'}
            {painFreeTwoMin ? ' · two-minute pain-free hold on file' : ''}
          </p>
          {shouldEncourageSlowReps(logs) && (
            <p className="mt-2 text-sm text-[var(--accent)]">
              Three days of 2-minute holds are on file. Slow, tiny-range reps
              are OK now if they do not make the pain worse.
            </p>
          )}
        </div>
      )}

      {cat?.cues && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
          {cat.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      )}

      {allowHold && (
        <label className="text-xs text-[var(--muted)]">
          Hold seconds {allowReps ? '(optional if you only did reps)' : ''}
          <input
            inputMode="decimal"
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base text-[var(--text)]"
            value={holdSec}
            onChange={(e) => setHoldSec(e.target.value)}
            placeholder={item.targetSeconds ? String(item.targetSeconds) : '120'}
          />
        </label>
      )}

      {allowReps && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--muted)]">
            Reps {allowHold ? '(optional if you only held)' : ''}
            <input
              inputMode="numeric"
              className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base text-[var(--text)]"
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Quality reps
            <input
              inputMode="numeric"
              className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base text-[var(--text)]"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              placeholder="same as reps"
            />
          </label>
        </div>
      )}

      {cat?.grips && (
        <label className="text-xs text-[var(--muted)]">
          Grip
          <select
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm text-[var(--text)]"
            value={grip}
            onChange={(e) => setGrip(e.target.value)}
          >
            <option value="">Pick a grip…</option>
            {PULLUP_GRIPS.map((g) => (
              <option key={g.id} value={g.label}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {(cat?.allowWeight || item.allowWeight) && (
        <label className="text-xs text-[var(--muted)]">
          Weight (lb, optional)
          <input
            inputMode="decimal"
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base text-[var(--text)]"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
      )}

      {(isBackExt || cat?.id === 'glute_bridge') && (
        <>
          <label className="text-xs text-[var(--muted)]">
            Pain after (0–10)
            <input
              inputMode="numeric"
              className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base text-[var(--text)]"
              value={pain}
              onChange={(e) => setPain(e.target.value)}
              placeholder="0 is none"
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            How did it feel?
            <textarea
              className="mt-1 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm text-[var(--text)]"
              rows={3}
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              placeholder="What felt better or worse. This is for you, not a grade."
            />
          </label>
        </>
      )}

      {last && (
        <p className="text-xs text-[var(--muted)]">
          Last set:{' '}
          {last.totalHoldSeconds ? `${last.totalHoldSeconds}s` : ''}
          {last.totalHoldSeconds && last.reps ? ' + ' : ''}
          {last.reps ? `${last.reps} reps` : ''}
          {last.grip ? ` · ${last.grip}` : ''}
        </p>
      )}

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={save}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f] disabled:opacity-50"
        >
          {saving ? 'Logged' : 'Save set'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-sm"
        >
          Done
        </button>
      </div>
    </div>
  )
}
