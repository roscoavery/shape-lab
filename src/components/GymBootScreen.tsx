import { LASTING_GYM_URL } from '../lib/gymLink'
import type { PersistInfo } from '../lib/gymHydrate'

type Props = {
  phase: 'loading' | 'error'
  error?: string | null
  persist?: PersistInfo | null
  onRetry?: () => void
  onContinueLocal?: () => void
}

export function GymBootScreen({ phase, error, persist, onRetry, onContinueLocal }: Props) {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-5 py-10">
      <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Shape Lab</p>
      <h1 className="mt-2 text-2xl font-semibold text-[var(--text)]">
        {phase === 'loading' ? 'Loading this gym' : 'This phone cannot see the gym yet'}
      </h1>
      {phase === 'loading' ? (
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          Pulling profiles, homework, notes, lessons, classes, feed, and wins from
          this gym link — not from whatever was last on this phone.
        </p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            {error ??
              'The gym file on this URL did not load. Profiles stay on the lasting gym link, not on Preview, a tunnel, or a new Vercel hostname.'}
          </p>
          <p className="mt-3 break-all text-sm text-[var(--text)]">{LASTING_GYM_URL}</p>
          {persist && !persist.lasting ? (
            <p className="mt-3 rounded-lg border border-[var(--bad)]/40 bg-[#2a1518] px-3 py-2 text-sm text-[var(--bad)]">
              This link is not keeping gym data overnight. Connect a Blob store on
              this Vercel project, then redeploy Production on the same URL.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[#06281f]"
              >
                Try again
              </button>
            ) : null}
            {onContinueLocal ? (
              <button
                type="button"
                onClick={onContinueLocal}
                className="rounded-lg border border-[var(--panel-border)] px-4 py-2 text-sm font-semibold"
              >
                Continue with what is on this phone
              </button>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
