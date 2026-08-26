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
        <strong className="text-[var(--text)]">Named Instagram URLs are still
        on the original browser/site</strong> — they were never uploaded here.
        Open Compare on that same link (below). If the list shows, we grab names +
        URLs automatically. Preview at 127.0.0.1 is a different site to your
        browser, so it looks empty.
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReferencePane />
        <CameraPane />
      </div>
    </div>
  )
}
