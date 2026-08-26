/**
 * Compare tab — side-by-side video study.
 * Reference video (collections in IndexedDB) next to the athlete camera
 * (live / delay cam / recorded replay). Stacks vertically on mobile.
 */

import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'

export function ComparePanel() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--text)]">About Instagram:</strong> Instagram
        offers no free public API to log in and read your saved collections (the
        Basic Display API was shut down, and scraping violates their terms). You
        can paste post/reel links to view them here. Play again / Loop restarts
        the embed in this tab so Instagram cannot yank you out to replay. Embeds
        still can't be scrubbed or slow-mo'd.{' '}
        <strong className="text-[var(--accent)]">
          Recommended: screen-record or download your own IG videos and upload
          the file
        </strong>{' '}
        for full loop, frame-scrub, and slow-motion control. Everything is stored
        on this device only.
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReferencePane />
        <CameraPane />
      </div>
    </div>
  )
}
