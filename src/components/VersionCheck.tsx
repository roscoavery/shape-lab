/**
 * VersionCheck — notices when the gym server is running a newer build than
 * this page loaded, and offers a one-tap reload. No more manual cache clearing.
 */
import { useEffect, useState } from 'react'

const BUILT_SHA = typeof __GYM_SHA__ === 'string' ? __GYM_SHA__.toLowerCase() : 'dev'

export function VersionCheck() {
  const [serverSha, setServerSha] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json()
        const sha = typeof data?.sha === 'string' ? data.sha.toLowerCase() : null
        if (alive && sha) setServerSha(sha)
      } catch {
        /* server unreachable — stay quiet */
      }
    }
    check()
    const id = setInterval(check, 60000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  if (!serverSha || BUILT_SHA === 'dev' || serverSha === BUILT_SHA) return null

  const hardReload = () => {
    // window.location.reload() re-serves the cached page on iOS home-screen
    // apps. A cache-busting query param forces a genuinely fresh load.
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('v', Date.now().toString(36))
      window.location.href = url.toString()
    } catch {
      window.location.reload()
    }
  }

  return (
    <div className="sticky top-0 z-50 flex items-center justify-between gap-3 bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#061418]">
      <span>New version available</span>
      <button
        type="button"
        onClick={hardReload}
        className="rounded-lg bg-[#061418] px-3 py-1 text-sm font-bold text-[var(--accent)]"
      >
        Reload
      </button>
    </div>
  )
}
