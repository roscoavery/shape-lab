/**
 * Compare tab — side-by-side video study.
 * Reference video (collections in IndexedDB + the shipped URL list) next to
 * the athlete camera (live / delay cam / recorded replay). Stacks vertically
 * on mobile.
 */

import { CameraPane } from './CameraPane'
import { ReferencePane } from './ReferencePane'

export function ComparePanel() {
  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-3 text-sm leading-relaxed text-[var(--muted)]">
        <strong className="text-[var(--text)]">Paste and rename here — it saves into the app.</strong>{' '}
        Named Instagram URLs land in Compare, stay on this device, and write into the app library
        so the next Preview still has them. Rename anytime. Tap <em>Save all in app</em> to keep
        the video files for offline playback.
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReferencePane />
        <CameraPane />
      </div>
    </div>
  )
}
