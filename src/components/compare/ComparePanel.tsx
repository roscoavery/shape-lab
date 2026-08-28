/**
 * Compare tab — side-by-side video study.
 * Reference video next to the athlete camera (live / delay cam / replay).
 * Full screen can split left/right or top/bottom: looping IG + delay/replay.
 */

import { useState } from 'react'
import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'
import { CompareLayoutContext, type CompareSplit } from './compareLayout'

export function ComparePanel() {
  const [fullscreen, setFullscreen] = useState(false)
  const [split, setSplit] = useState<CompareSplit>('lr')

  const grid =
    fullscreen
      ? split === 'tb'
        ? 'grid h-full min-h-0 grid-rows-2 gap-1'
        : 'grid h-full min-h-0 grid-cols-2 gap-1'
      : 'grid gap-4 lg:grid-cols-2'

  return (
    <CompareLayoutContext.Provider
      value={{ fullscreen, split, setFullscreen, setSplit }}
    >
      <div
        className={
          fullscreen
            ? 'fixed inset-0 z-[120] flex flex-col bg-black'
            : 'flex flex-col gap-4'
        }
      >
        {!fullscreen && (
          <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
            <strong className="text-[var(--text)]">Paste, rename, and tag here — it saves into the app.</strong>{' '}
            Instagram, TikTok, and Facebook video URLs land in Compare. Full screen is a
            split of the looping clip and your delay cam / replay — left/right or
            top/bottom — with scrub on both.
          </section>
        )}
        <div
          className={`flex shrink-0 flex-wrap items-center gap-2 ${
            fullscreen ? 'bg-black/90 px-3 py-2 text-white' : ''
          }`}
        >
          <button
            type="button"
            onClick={() => setFullscreen(!fullscreen)}
            className={
              fullscreen
                ? 'rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-[#06281f]'
                : 'rounded-lg border border-[var(--panel-border)] px-3 py-1.5 text-sm'
            }
          >
            {fullscreen ? 'Exit full screen' : 'Full screen split'}
          </button>
          <button
            type="button"
            onClick={() => setSplit('lr')}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              split === 'lr'
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : fullscreen
                  ? 'border border-white/20 text-white/80'
                  : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            Left / right
          </button>
          <button
            type="button"
            onClick={() => setSplit('tb')}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              split === 'tb'
                ? 'bg-[var(--accent-dim)] font-semibold text-white'
                : fullscreen
                  ? 'border border-white/20 text-white/80'
                  : 'border border-[var(--panel-border)] text-[var(--muted)]'
            }`}
          >
            Top / bottom
          </button>
          {fullscreen && (
            <p className="text-xs text-white/70">
              Looping reference + delay cam / replay. Scrub each side independently.
            </p>
          )}
        </div>
        <div className={`min-h-0 flex-1 ${grid}`}>{/* keep both panes mounted */}
          <ReferencePane />
          <CameraPane />
        </div>
      </div>
    </CompareLayoutContext.Provider>
  )
}
