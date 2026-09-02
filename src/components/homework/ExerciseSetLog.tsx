import { useState } from 'react'
import type { HomeworkItem, HomeworkTrackMode } from '../../types'
import { HOMEWORK_CATALOG } from '../../config/homeworkCatalog'
import { homeworkTitle } from '../../lib/homeworkLabel'

export const OTHER_EXERCISE = '__other__'

export type ExerciseSetInput = {
  item: HomeworkItem
  reps: number
  qualityReps: number
  sets: number
  holdSeconds?: number
  trackMode: HomeworkTrackMode
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
    qualityReps: number
    sets: number
    holdSeconds?: number
  }) => void
  onLog: (input: Omit<ExerciseSetInput, 'item'> & { itemId: string }) => void
  /** Prefill hold seconds from a stopped watch. */
  holdSeconds?: string
  onHoldSeconds?: (value: string) => void
  tone?: 'panel' | 'studio'
  allowOther?: boolean
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
}: Props) {
  const [kind, setKind] = useState<'hold' | 'reps'>('reps')
  const [reps, setReps] = useState('')
  const [quality, setQuality] = useState('')
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
    const q = quality === '' ? r : Number(quality)
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
      qualityReps: hasReps && Number.isFinite(q) ? Math.min(q, r || q) : 0,
      sets: Number.isFinite(s) && s > 0 ? Math.round(s) : 1,
      holdSeconds: hasHold ? hold : undefined,
      trackMode: (kind === 'hold' && hasReps ? 'hold_or_reps' : kind) as HomeworkTrackMode,
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
      setQuality('')
      return
    }
    if (!selectedId) {
      setError('Pick the exercise this set was for.')
      return
    }
    setError(null)
    onLog({ itemId: selectedId, ...payload })
    setReps('')
    setQuality('')
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        What did you just do?
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setKind('hold')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            kind === 'hold' ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-white/8'
          }`}
        >
          Hold time
        </button>
        <button
          type="button"
          onClick={() => setKind('reps')}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
            kind === 'reps' ? 'bg-[var(--accent)] text-[#06281f]' : 'bg-white/8'
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
          <option value={OTHER_EXERCISE}>Other — type or pick another exercise</option>
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
            placeholder="Or type it — bear crawls, 10 push-ups…"
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
      {kind === 'reps' && (
        <div className="grid grid-cols-3 gap-2">
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
          <label className="text-xs text-[var(--muted)]">
            Quality
            <input
              inputMode="numeric"
              className={`mt-1 ${input}`}
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
              placeholder="same"
            />
          </label>
        </div>
      )}
      {error && <p className="text-sm text-[var(--bad)]">{error}</p>}
      <button
        type="button"
        onClick={save}
        className="h-11 rounded-lg bg-[var(--accent)] text-sm font-semibold text-[#06281f]"
      >
        {other ? 'Add and log' : kind === 'hold' ? 'Log hold' : 'Log set'}
      </button>
    </div>
  )
}
