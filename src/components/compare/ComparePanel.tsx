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
        <strong className="text-[var(--text)]">Keep this same link</strong> while
        we build — saved URLs live in <em>this</em> browser on this origin. Paste
        public Instagram URLs; they download into the app (Save all in app).
        Search, reorder, rename. Hit <strong className="text-[var(--text)]">Export
        library</strong> so you have a JSON backup that never expires. Private
        clips will not load.
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReferencePane />
        <CameraPane />
      </div>
    </div>
  )
}
