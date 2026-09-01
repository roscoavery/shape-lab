import { useMemo, useState } from 'react'
import type { HomeworkItem, HomeworkLog, HomeworkTrackMode } from '../../types'
import { getCatalogItem, PULLUP_GRIPS } from '../../config/homeworkCatalog'
import { homeworkTitle } from '../../lib/homeworkLabel'

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
  const [sessionMode, setSessionMode] = useState<HomeworkTrackMode>(
    mode === 'hold_or_reps' ? 'hold' : mode,
  )
  const [reps, setReps] = useState(String(item.targetReps ?? cat?.targetReps ?? ''))
  const [quality, setQuality] = useState('')
  const [holdSec, setHoldSec] = useState('')
  const [grip, setGrip] = useState(item.grip ?? '')
  const [weight, setWeight] = useState('')
  const [pain, setPain] = useState('')
  const [journal, setJournal] = useState('')
  const [error, setError] = useState<string | null>(null)

  const last = logs.find((l) => l.kind === 'reps' || (l.reps != null && l.kind !== 'sequence'))
  const bestHold = useMemo(
    () => logs.reduce((best, l) => Math.max(best, l.totalHoldSeconds || 0), 0),
    [logs],
  )
  const isBackExt = cat?.id === 'back_extension'
  const painFreeTwoMin = logs.some(
    (l) =>
      (l.totalHoldSeconds ?? 0) >= 120 && (l.painLevel == null || l.painLevel === 0),
  )
  const blockReps = isBackExt && sessionMode !== 'hold' && !painFreeTwoMin

  const save = () => {
    if (blockReps) {
      setError('Hold two pain-free minutes before back-extension reps.')
      return
    }
    const r = Number(reps)
    const q = quality === '' ? r : Number(quality)
    const hold = holdSec === '' ? undefined : Number(holdSec)
    const w = weight === '' ? undefined : Number(weight)
    const p = pain === '' ? undefined : Number(pain)
    if (sessionMode === 'hold' || sessionMode === 'hold_or_reps') {
      if (hold == null || !Number.isFinite(hold) || hold <= 0) {
        setError('Enter hold seconds.')
        return
      }
    }
    if (sessionMode === 'reps' || sessionMode === 'hold_or_reps') {
      if (!Number.isFinite(r) || r <= 0) {
        setError('Enter how many reps you did.')
        return
      }
      if (!Number.isFinite(q) || q < 0) {
        setError('Quality reps has to be a number.')
        return
      }
    }
    onLog({
      reps: Number.isFinite(r) ? r : 0,
      qualityReps: Number.isFinite(q) ? Math.min(q, r || q) : 0,
      holdSeconds: hold,
      grip: grip || undefined,
      weightLb: w != null && Number.isFinite(w) ? w : undefined,
      painLevel: p != null && Number.isFinite(p) ? Math.min(10, Math.max(0, p)) : undefined,
      journal: journal.trim() || undefined,
      trackMode: sessionMode === 'hold_or_reps' ? (hold ? 'hold' : 'reps') : sessionMode,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          Log {sessionMode === 'hold' ? 'a hold' : 'reps'}
        </p>
        <h3 className="text-lg font-semibold text-[var(--text)]">{homeworkTitle(item)}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {cat?.notes ??
            item.notes ??
            'Count the reps you would show a coach, then the ones that were quality.'}
        </p>
      </div>

      {isBackExt && (
        <div className="rounded-lg border border-[var(--warn)]/40 bg-[#2a2312] px-3 py-2 text-sm text-[var(--text)]">
          <p className="font-semibold text-[var(--warn)]">Back extension rule</p>
          <p className="mt-1 text-[var(--muted)]">
            Do not start reps until you can hold 2 minutes with no pain. When reps
            start, go very slow in a tiny range. If you cannot even get on the
            machine for an iso hold, stay off a few days, then ease back in
            starting a little arched and working toward a straight body. Expose
            yourself to what you can handle and build tissue tolerance without pain.
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Best hold on file: {bestHold > 0 ? `${bestHold.toFixed(0)}s` : 'none yet'}
            {painFreeTwoMin ? ' · two-minute pain-free hold unlocked' : ''}
          </p>
        </div>
      )}

      {cat?.cues && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--text)]">
          {cat.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      )}

      {mode === 'hold_or_reps' && (
        <div className="flex gap-2">
          {(['hold', 'reps'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSessionMode(m)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize ${
                sessionMode === m
                  ? 'bg-[var(--accent)] text-[#06281f]'
                  : 'border border-[var(--panel-border)] text-[var(--muted)]'
              }`}
            >
              {m === 'hold' ? 'Log a hold' : 'Log reps'}
            </button>
          ))}
        </div>
      )}

      {blockReps && (
        <p className="rounded-lg bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
          Hold two pain-free minutes first. That is how this drill stays safe.
        </p>
      )}

      {(sessionMode === 'hold' || (sessionMode === 'hold_or_reps' && !blockReps)) && (
        <label className="text-xs text-[var(--muted)]">
          Hold seconds
          <input
            inputMode="decimal"
            className="mt-1 h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-base text-[var(--text)]"
            value={holdSec}
            onChange={(e) => setHoldSec(e.target.value)}
            placeholder={item.targetSeconds ? String(item.targetSeconds) : '120'}
          />
        </label>
      )}

      {sessionMode !== 'hold' && !blockReps && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--muted)]">
            Reps
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
          Last time:{' '}
          {last.reps
            ? `${last.reps} reps${last.qualityReps != null ? ` · ${last.qualityReps} quality` : ''}`
            : `${last.totalHoldSeconds}s`}
          {last.grip ? ` · ${last.grip}` : ''}
        </p>
      )}

      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={save}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
        >
          Save set
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
