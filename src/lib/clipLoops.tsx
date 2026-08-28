/**
 * Persist A/B loop points per gym URL so Learn, Compare, and Classes share them.
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

export type ClipLoop = {
  a: number
  b: number
  updatedAt: string
}

type ClipLoopsFile = {
  kind: 'shape-lab-clip-loops'
  version: 1
  exportedAt: string
  loops: Record<string, ClipLoop>
}

type ClipLoopsValue = {
  loops: Record<string, ClipLoop>
  getLoop: (url: string) => ClipLoop | null
  setLoop: (url: string, a: number | null, b: number | null) => void
}

const ClipLoopsContext = createContext<ClipLoopsValue | null>(null)

async function pullLoops(): Promise<Record<string, ClipLoop>> {
  try {
    const res = await fetch('/api/clip-loops')
    if (!res.ok) return {}
    const data = (await res.json()) as ClipLoopsFile
    if (!data || data.kind !== 'shape-lab-clip-loops' || !data.loops) return {}
    return data.loops
  } catch {
    return {}
  }
}

export function ClipLoopsProvider({ children }: { children: ReactNode }) {
  const [loops, setLoops] = useState<Record<string, ClipLoop>>({})
  const timerRef = useRef<number | null>(null)
  const latestRef = useRef(loops)
  latestRef.current = loops

  useEffect(() => {
    void pullLoops().then((remote) => {
      setLoops((local) => ({ ...remote, ...local }))
    })
  }, [])

  const flush = useCallback((next: Record<string, ClipLoop>) => {
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
        } satisfies ClipLoopsFile),
      })
    }, 400)
  }, [])

  const setLoop = useCallback(
    (url: string, a: number | null, b: number | null) => {
      const key = clipLoopKey(url)
      setLoops((prev) => {
        const next = { ...prev }
        if (a === null || b === null || !(b > a)) {
          delete next[key]
        } else {
          next[key] = { a, b, updatedAt: new Date().toISOString() }
        }
        latestRef.current = next
        flush(next)
        return next
      })
    },
    [flush],
  )

  const getLoop = useCallback(
    (url: string) => latestRef.current[clipLoopKey(url)] ?? loops[clipLoopKey(url)] ?? null,
    [loops],
  )

  const value = useMemo(() => ({ loops, getLoop, setLoop }), [loops, getLoop, setLoop])
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
