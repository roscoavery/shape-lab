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
        <strong className="text-[var(--text)]">Instagram reels:</strong> paste a
        public post/reel URL into a collection. Shape Lab fetches a playable copy
        and loops it here (pause, scrub, slow-mo). Private clips will not load.
        You do not need to screen-record.
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReferencePane />
        <CameraPane />
      </div>
    </div>
  )
}
