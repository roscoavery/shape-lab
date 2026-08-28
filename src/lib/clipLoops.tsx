/**
 * Persist several named A/B loops per gym URL.
 * Learn, Compare, and Classes share the same list and the selected loop.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { clipLoopKey } from './socialUrls'
import { createId } from './storage'

export const MAX_LOOP_PRESETS = 8

export type ClipLoopPreset = {
  id: string
  name: string
  a: number
  b: number
  updatedAt: string
}

export type ClipLoopSet = {
  presets: ClipLoopPreset[]
  activeId: string | null
}

type ClipLoopsFile = {
  kind: 'shape-lab-clip-loops'
  version: 1
  exportedAt: string
  loops: Record<string, ClipLoopSet | { a: number; b: number; updatedAt?: string }>
}

type ClipLoopsValue = {
  loops: Record<string, ClipLoopSet>
  getSet: (url: string) => ClipLoopSet | null
  getActive: (url: string) => ClipLoopPreset | null
  selectPreset: (url: string, id: string | null) => void
  saveNewPreset: (url: string, a: number, b: number, name?: string) => ClipLoopPreset | null
  updateActive: (url: string, a: number, b: number) => void
  renamePreset: (url: string, id: string, name: string) => void
  removePreset: (url: string, id: string) => void
}

const ClipLoopsContext = createContext<ClipLoopsValue | null>(null)

function nextLoopName(presets: ClipLoopPreset[]): string {
  const used = new Set(presets.map((p) => p.name.trim().toLowerCase()))
  for (let n = 1; n <= MAX_LOOP_PRESETS + 2; n += 1) {
    const name = `Loop ${n}`
    if (!used.has(name.toLowerCase())) return name
  }
  return `Loop ${presets.length + 1}`
}

function normalizeEntry(value: unknown): ClipLoopSet | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as ClipLoopSet & { a?: number; b?: number; updatedAt?: string }
  if (Array.isArray(raw.presets)) {
    const presets = raw.presets.filter(
      (p) =>
        p &&
        typeof p.id === 'string' &&
        Number.isFinite(p.a) &&
        Number.isFinite(p.b) &&
        p.b > p.a,
    )
    if (presets.length === 0) return null
    const activeId =
      typeof raw.activeId === 'string' && presets.some((p) => p.id === raw.activeId)
        ? raw.activeId
        : presets[0]!.id
    return { presets: presets.slice(0, MAX_LOOP_PRESETS), activeId }
  }
  const a = Number(raw.a)
  const b = Number(raw.b)
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null
  const id = 'loop_1'
  return {
    presets: [
      {
        id,
        name: 'Loop 1',
        a,
        b,
        updatedAt: raw.updatedAt || new Date().toISOString(),
      },
    ],
    activeId: id,
  }
}

async function pullLoops(): Promise<Record<string, ClipLoopSet>> {
  try {
    const res = await fetch('/api/clip-loops')
    if (!res.ok) return {}
    const data = (await res.json()) as ClipLoopsFile
    if (!data || data.kind !== 'shape-lab-clip-loops' || !data.loops) return {}
    const out: Record<string, ClipLoopSet> = {}
    for (const [key, value] of Object.entries(data.loops)) {
      const entry = normalizeEntry(value)
      if (entry) out[clipLoopKey(key)] = entry
    }
    return out
  } catch {
    return {}
  }
}

export function ClipLoopsProvider({ children }: { children: ReactNode }) {
  const [loops, setLoops] = useState<Record<string, ClipLoopSet>>({})
  const timerRef = useRef<number | null>(null)
  const latestRef = useRef(loops)
  latestRef.current = loops

  useEffect(() => {
    void pullLoops().then((remote) => {
      setLoops((local) => ({ ...remote, ...local }))
    })
  }, [])

  const flush = useCallback((next: Record<string, ClipLoopSet>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => {
      void fetch('/api/clip-loops', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'shape-lab-clip-loops',
          version: 1,
          exportedAt: new Date().toISOString(),
          loops: next,
        }),
      })
    }, 400)
  }, [])

  const patch = useCallback(
    (url: string, fn: (current: ClipLoopSet | null) => ClipLoopSet | null) => {
      const key = clipLoopKey(url)
      setLoops((prev) => {
        const next = { ...prev }
        const updated = fn(prev[key] ?? null)
        if (!updated || updated.presets.length === 0) delete next[key]
        else next[key] = updated
        latestRef.current = next
        flush(next)
        return next
      })
    },
    [flush],
  )

  const getSet = useCallback(
    (url: string) => latestRef.current[clipLoopKey(url)] ?? loops[clipLoopKey(url)] ?? null,
    [loops],
  )

  const getActive = useCallback(
    (url: string) => {
      const set = getSet(url)
      if (!set) return null
      return set.presets.find((p) => p.id === set.activeId) ?? set.presets[0] ?? null
    },
    [getSet],
  )

  const selectPreset = useCallback(
    (url: string, id: string | null) => {
      patch(url, (current) => {
        if (!current) return current
        if (!id) return { ...current, activeId: null }
        if (!current.presets.some((p) => p.id === id)) return current
        return { ...current, activeId: id }
      })
    },
    [patch],
  )

  const saveNewPreset = useCallback(
    (url: string, a: number, b: number, name?: string): ClipLoopPreset | null => {
      if (!(b > a)) return null
      const key = clipLoopKey(url)
      const current = latestRef.current[key] ?? null
      const list = current?.presets ?? []
      if (list.length >= MAX_LOOP_PRESETS) return null
      const preset: ClipLoopPreset = {
        id: createId('loop'),
        name: (name?.trim() || nextLoopName(list)).slice(0, 40),
        a,
        b,
        updatedAt: new Date().toISOString(),
      }
      patch(url, (cur) => {
        const existing = cur?.presets ?? []
        if (existing.length >= MAX_LOOP_PRESETS) return cur
        return { presets: [...existing, preset], activeId: preset.id }
      })
      return preset
    },
    [patch],
  )

  const updateActive = useCallback(
    (url: string, a: number, b: number) => {
      if (!(b > a)) return
      patch(url, (current) => {
        if (!current?.activeId) return current
        return {
          ...current,
          presets: current.presets.map((p) =>
            p.id === current.activeId
              ? { ...p, a, b, updatedAt: new Date().toISOString() }
              : p,
          ),
        }
      })
    },
    [patch],
  )

  const renamePreset = useCallback(
    (url: string, id: string, name: string) => {
      const nextName = name.trim().slice(0, 40)
      if (!nextName) return
      patch(url, (current) => {
        if (!current) return current
        return {
          ...current,
          presets: current.presets.map((p) => (p.id === id ? { ...p, name: nextName } : p)),
        }
      })
    },
    [patch],
  )

  const removePreset = useCallback(
    (url: string, id: string) => {
      patch(url, (current) => {
        if (!current) return current
        const presets = current.presets.filter((p) => p.id !== id)
        if (presets.length === 0) return null
        const activeId =
          current.activeId === id ? presets[0]!.id : current.activeId
        return { presets, activeId }
      })
    },
    [patch],
  )

  const value = useMemo(
    () => ({
      loops,
      getSet,
      getActive,
      selectPreset,
      saveNewPreset,
      updateActive,
      renamePreset,
      removePreset,
    }),
    [
      loops,
      getSet,
      getActive,
      selectPreset,
      saveNewPreset,
      updateActive,
      renamePreset,
      removePreset,
    ],
  )
  return <ClipLoopsContext.Provider value={value}>{children}</ClipLoopsContext.Provider>
}

export function useClipLoops(): ClipLoopsValue {
  const ctx = useContext(ClipLoopsContext)
  if (!ctx) {
    throw new Error('useClipLoops must be used inside ClipLoopsProvider')
  }
  return ctx
}

export function useClipLoopsOptional(): ClipLoopsValue | null {
  return useContext(ClipLoopsContext)
}
