/**
 * Public shape study library (build 1076).
 *
 * Rendered standalone at /studylib/<token> with NO sign-in. Read-only shape
 * browser for athletes to study: shape names, stills, and cues. No account
 * needed, no edit paths, no athlete data.
 */

import { useEffect, useMemo, useState } from 'react'
import { SHAPES } from '../../config/shapes'
import { shippedFileList } from '../../lib/shippedRefs'

function stillUrls(shapeId: string): string[] {
  return shippedFileList(shapeId).map((f) => `/references/${f}`)
}

export default function PublicLibraryPage({ token }: { token: string }) {
  const [valid, setValid] = useState<boolean | null>(null)
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/share/library?token=${encodeURIComponent(token)}`)
      .then((r) => setValid(r.ok))
      .catch(() => setValid(false))
  }, [token])

  const shapes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return SHAPES.filter((s) => {
      if (!q) return true
      return s.name.toLowerCase().includes(q)
    })
  }, [query])

  if (valid === false) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-center text-white/70">This link is invalid or expired.</p>
      </div>
    )
  }
  if (valid === null) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0a1014] p-6">
        <p className="text-center text-white/70">Loading…</p>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#0a1014] px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-sky-300/80">
          Shape library · Study guide
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold text-white">Body shapes</h1>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shapes…"
          className="mt-4 h-11 w-full rounded-xl border border-white/15 bg-black/40 px-4 text-white placeholder:text-white/40"
        />
        <div className="mt-4 space-y-3">
          {shapes.map((s) => {
            const stills = stillUrls(s.id)
            const open = openId === s.id
            return (
              <div key={s.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : s.id)}
                  className="flex w-full items-center gap-3 text-left"
                >
                  {stills[0] && (
                    <img
                      src={stills[0]}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover bg-black/40"
                    />
                  )}
                  <span className="flex-1 text-base font-semibold text-white">{s.name}</span>
                  <span className="text-white/40">{open ? '▾' : '▸'}</span>
                </button>
                {open && (
                  <div className="mt-3">
                    {stills.length > 1 && (
                      <div className="mb-3 flex gap-2 overflow-x-auto">
                        {stills.map((u, i) => (
                          <img
                            key={i}
                            src={u}
                            alt=""
                            className="h-28 w-28 shrink-0 rounded-xl object-contain bg-black/40"
                          />
                        ))}
                      </div>
                    )}
                    {s.description && (
                      <p className="text-sm leading-relaxed text-white/75">{s.description}</p>
                    )}
                    {s.tips && s.tips.length > 0 && (
                      <ul className="mt-2 space-y-1">
                        {s.tips.map((t, i) => (
                          <li key={i} className="text-sm text-white/60">· {t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {shapes.length === 0 && (
            <p className="py-8 text-center text-white/50">No shapes match.</p>
          )}
        </div>
      </div>
    </div>
  )
}
