/**
 * SystemSwitcher — makes it explicit whose coaching system you're viewing.
 * Ryan's system is the default; other systems appear only if their
 * visibility lets you see them. Switching never mixes content between
 * systems.
 */

import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import {
  RYAN_SYSTEM_ID,
  getActiveSystemId,
  setActiveSystemId,
  subscribeActiveSystem,
  subscribeCoachSystems,
  visibleSystemsFor,
  viewerFromAthlete,
  VISIBILITY_LABELS,
  type CoachSystem,
} from '../../lib/coachSystems'

export function SystemSwitcher({ signedIn, onChange }: { signedIn: Athlete | null; onChange?: (s: CoachSystem) => void }) {
  const [, setTick] = useState(0)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const off1 = subscribeCoachSystems(bump)
    const off2 = subscribeActiveSystem(bump)
    return () => {
      off1()
      off2()
    }
  }, [])

  const viewer = viewerFromAthlete(signedIn)
  const systems = visibleSystemsFor(viewer)
  const activeId = getActiveSystemId()
  const active = systems.find((s) => s.id === activeId) ?? systems[0] ?? null

  const pick = (s: CoachSystem) => {
    setActiveSystemId(s.id)
    setOpen(false)
    onChange?.(s)
  }

  if (!active) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-black uppercase tracking-[0.18em] text-white/45">
            Viewing system
          </span>
          <span className="block truncate text-sm font-bold text-white">
            {active.name}
            {active.id === RYAN_SYSTEM_ID && <span className="ml-1.5 text-[10px] font-semibold text-white/50">default</span>}
            {active.locked && <span className="ml-1.5 text-[10px] font-semibold text-white/50">🔒</span>}
          </span>
        </span>
        <span className="text-white/50">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0d141b] p-1 shadow-xl">
          {systems.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => pick(s)}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left hover:bg-white/5 ${
                s.id === active.id ? 'bg-white/5' : ''
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white">
                  {s.name}
                  {s.id === RYAN_SYSTEM_ID && <span className="ml-1.5 text-[10px] text-white/50">default</span>}
                </span>
                <span className="block truncate text-xs text-white/45">
                  by {s.ownerName} · {VISIBILITY_LABELS[s.mapVisibility]}
                  {s.locked ? ' · locked' : ''}
                </span>
              </span>
              {s.id === active.id && <span className="text-emerald-300">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
