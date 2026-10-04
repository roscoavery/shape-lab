import { useState } from 'react'
import type { HomeworkItem, HomeworkTrackMode } from '../../types'
import { HOMEWORK_CATALOG } from '../../config/homeworkCatalog'
import { homeworkTitle } from '../../lib/homeworkLabel'

export const OTHER_EXERCISE = '__other__'

export type ExerciseSetInput = {
  item: HomeworkItem
  reps: number
  sets: number
  holdSeconds?: number
  trackMode: HomeworkTrackMode
  /** Quality rating 1–5 (reps: low = 1, medium = 3, high = 5). */
  quality?: number
  /** Rep speed 0 = fast, 100 = slow (reps only). */
  repSpeed?: number
}

type Props = {
  items: HomeworkItem[]
  selectedId: string
  onSelectId: (id: string) => void
  /** Called when they pick Other and choose a catalog item or type a name. */
  onOther: (input: {
    catalogId?: string
    name: string
    trackMode: HomeworkTrackMode
    reps: number
    sets: number
    holdSeconds?: number
    quality?: number
    repSpeed?: number
  }) => void
  onLog: (input: Omit<ExerciseSetInput, 'item'> & { itemId: string }) => void
  /** Prefill hold seconds from a stopped watch. */
  holdSeconds?: string
  onHoldSeconds?: (value: string) => void
  tone?: 'panel' | 'studio'
  allowOther?: boolean
  /** DOM id for the guided tour to spotlight this form. */
  tourId?: string
}

function speedLabel(v: number): string {
  return v <= 33 ? 'fast' : v >= 67 ? 'slow' : 'steady'
}

function qualityLabel(q: number): string {
  return q <= 2 ? 'low' : q >= 4 ? 'high' : 'medium'
}

export function ExerciseSetLog({
  items,
  selectedId,
  onSelectId,
  onOther,
  onLog,
  holdSeconds,
  onHoldSeconds,
  tone = 'panel',
  allowOther = true,
  tourId,
}: Props) {
  const [kind, setKind] = useState<'hold' | 'reps'>('reps')
  const [reps, setReps] = useState('')
  const [quality, setQuality] = useState<number | undefined>(undefined)
  const [repSpeed, setRepSpeed] = useState(50)
  const [sets, setSets] = useState('1')
  const [typedHold, setTypedHold] = useState('')
  const [otherName, setOtherName] = useState('')
  const [otherCatalog, setOtherCatalog] = useState('')
  const [error, setError] = useState<string | null>(null)
  const other = selectedId === OTHER_EXERCISE
  const input =
    tone === 'studio'
      ? 'h-11 w-full rounded-lg border border-white/15 bg-black/30 px-3 text-sm'
      : 'h-11 w-full rounded-lg border border-[var(--panel-border)] bg-[#0d1218] px-3 text-sm'

  const save = () => {
    const holdRaw = holdSeconds ?? typedHold
    const hold = holdRaw === '' ? undefined : Number(holdRaw)
    const r = Number(reps)
    const s = Number(sets)
    const hasHold = hold != null && Number.isFinite(hold) && hold > 0
    const hasReps = Number.isFinite(r) && r > 0
    if (kind === 'hold' && !hasHold) {
      setError('Enter hold seconds, or start and stop the watch first.')
      return
    }
    if (kind === 'reps' && !hasReps) {
      setError('Enter how many reps you did in a set.')
      return
    }
    const payload = {
      reps: hasReps ? r : 0,
      sets: Number.isFinite(s) && s > 0 ? Math.round(s) : 1,
      holdSeconds: hasHold ? hold : undefined,
      trackMode: (kind === 'hold' && hasReps ? 'hold_or_reps' : kind) as HomeworkTrackMode,
      quality,
      repSpeed: kind === 'reps' ? repSpeed : undefined,
    }
    if (other) {
      const name = otherName.trim() || HOMEWORK_CATALOG.find((c) => c.id === otherCatalog)?.name || ''
      if (!name) {
        setError('Pick a catalog exercise or type what you did.')
        return
      }
      setError(null)
      onOther({
        catalogId: otherCatalog || undefined,
        name,
        ...payload,
      })
      setOtherName('')
      setOtherCatalog('')
      setReps('')
      setQuality(undefined)
      return
    }
    if (!selectedId) {
      setError('Pick the exercise this set was for.')
      return
    }
    setError(null)
    onLog({ itemId: selectedId, ...payload })
    setReps('')
    setQuality(undefined)
  }

  return (
    <div className="flex flex-col gap-2" id={tourId}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        What did you just do?
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setKind('hold')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            kind === 'hold' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/8'
          }`}
        >
          Hold time
        </button>
        <button
          type="button"
          onClick={() => setKind('reps')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            kind === 'reps' ? 'bg-[var(--accent)] text-[var(--on-accent)]' : 'bg-white/8'
          }`}
        >
          Reps / sets
        </button>
      </div>
      <select
        className={input}
        value={selectedId}
        onChange={(e) => onSelectId(e.target.value)}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {homeworkTitle(item)}
          </option>
        ))}
        {allowOther && (
          <option value={OTHER_EXERCISE}>Other, type or pick another exercise</option>
        )}
      </select>
      {other && (
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className={input}
            value={otherCatalog}
            onChange={(e) => {
              setOtherCatalog(e.target.value)
              const cat = HOMEWORK_CATALOG.find((c) => c.id === e.target.value)
              if (cat) setKind(cat.trackMode === 'hold' ? 'hold' : 'reps')
            }}
          >
            <option value="">Catalog…</option>
            {HOMEWORK_CATALOG.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className={input}
            placeholder="Or type it, bear crawls, 10 push-ups…"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
          />
        </div>
      )}
      {kind === 'hold' && (
        <label className="text-xs text-[var(--muted)]">
          Seconds
          <input
            inputMode="decimal"
            className={`mt-1 ${input}`}
            value={holdSeconds ?? typedHold}
            onChange={(e) =>
              onHoldSeconds ? onHoldSeconds(e.target.value) : setTypedHold(e.target.value)
            }
          />
        </label>
      )}
      {kind === 'hold' && (
        <div>
          <p className="text-xs text-[var(--muted)]">
            Quality{quality != null ? ` · ${qualityLabel(quality)} (${quality}/5)` : ''}
          </p>
          <div className="mt-1 flex gap-1.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQuality(quality === n ? undefined : n)}
                aria-pressed={quality === n}
                className={`h-10 flex-1 rounded-lg text-sm font-bold ${
                  quality === n
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'bg-white/8 text-[var(--text)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      {kind === 'reps' && (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-[var(--muted)]">
            Sets
            <input
              inputMode="numeric"
              className={`mt-1 ${input}`}
              value={sets}
              onChange={(e) => setSets(e.target.value)}
            />
          </label>
          <label className="text-xs text-[var(--muted)]">
            Reps / set
            <input
              inputMode="numeric"
              className={`mt-1 ${input}`}
              value={reps}
              onChange={(e) => setReps(e.target.value)}
            />
          </label>
        </div>
      )}
      {kind === 'reps' && (
        <div>
          <p className="text-xs text-[var(--muted)]">
            Rep speed · <span className="font-semibold text-[var(--text)]">{speedLabel(repSpeed)}</span>
          </p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-[var(--muted)]">fast</span>
            <input
              type="range"
              min={0}
              max={100}
              value={repSpeed}
              onChange={(e) => setRepSpeed(Number(e.target.value))}
              className="flex-1"
              aria-label="Rep speed, fast to slow"
            />
            <span className="text-xs text-[var(--muted)]">slow</span>
          </div>
        </div>
      )}
      {kind === 'reps' && (
        <div>
          <p className="text-xs text-[var(--muted)]">Quality</p>
          <div className="mt-1 flex gap-1.5">
            {[
              { label: 'Low', value: 1 },
              { label: 'Medium', value: 3 },
              { label: 'High', value: 5 },
            ].map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setQuality(quality === opt.value ? undefined : opt.value)}
                aria-pressed={quality === opt.value}
                className={`h-10 flex-1 rounded-lg text-sm font-semibold ${
                  quality === opt.value
                    ? 'bg-[var(--accent)] text-[var(--on-accent)]'
                    : 'bg-white/8 text-[var(--text)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button
        type="button"
        onClick={save}
        className="h-11 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[var(--on-accent)]"
      >
        {other ? 'Add and log' : kind === 'hold' ? 'Log hold' : 'Log set'}
      </button>
    </div>
  )
}
