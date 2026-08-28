/**
 * Ryan-only editor: athlete tumbling copy vs app / camera / grading notes.
 */

import { useEffect, useState } from 'react'
import { useShapeCopy } from './ShapeCopyContext'

type Props = {
  shapeId: string
  shapeName: string
}

export function ShapeCopyEditor({ shapeId, shapeName }: Props) {
  const { canEdit, copyFor, saveCopy } = useShapeCopy()
  const resolved = copyFor(shapeId)
  const [athlete, setAthlete] = useState(resolved.athlete)
  const [app, setApp] = useState(resolved.app)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<string | null>(null)

  useEffect(() => {
    const next = copyFor(shapeId)
    setAthlete(next.athlete)
    setApp(next.app)
    setFlash(null)
  }, [shapeId, copyFor])

  if (!canEdit) return null

  const save = async () => {
    setBusy(true)
    setFlash(null)
    try {
      await saveCopy(shapeId, { athlete, app })
      setFlash('Saved into the app — every browser using this gym computer has it.')
    } catch {
      setFlash('Could not save — keep the Shape Lab server running.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--accent)]/35 bg-[var(--panel)] p-5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
        Ryan · edit copy
      </p>
      <h4 className="mt-1 text-sm font-semibold text-[var(--text)]">
        Two versions of {shapeName}
      </h4>
      <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted)]">
        Athletes read the tumbling notes in the library and on the shape test. The
        app notes stay with scoring — camera angle, SIDE VIEW, quality threshold,
        stance. Saving writes both into this gym computer.
      </p>
      <label className="mt-4 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          What the athlete needs to know
        </span>
        <textarea
          value={athlete}
          onChange={(e) => setAthlete(e.target.value)}
          rows={7}
          className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm leading-relaxed text-[var(--text)]"
        />
      </label>
      <label className="mt-3 block">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          What the app should know
        </span>
        <textarea
          value={app}
          onChange={(e) => setApp(e.target.value)}
          rows={7}
          className="mt-1.5 w-full rounded-xl border border-[var(--panel-border)] bg-[#0d1218] px-3 py-2 text-sm leading-relaxed text-[var(--text)]"
        />
      </label>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-[#06281f] disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save both'}
        </button>
        {flash && (
          <p className="text-[12px] text-[var(--accent)]">{flash}</p>
        )}
      </div>
    </section>
  )
}
