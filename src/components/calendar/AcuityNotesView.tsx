import { useState } from 'react'
import {
  acuityPaidInFull,
  formatPhoneDisplay,
  type AcuityNotes,
} from '../../lib/acuityNotes'

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
      {children}
    </p>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-start gap-2 py-1 text-sm">
      <Eyebrow>{label}</Eyebrow>
      <div className="min-w-0 text-[var(--text)]">{children}</div>
    </div>
  )
}

/**
 * Renders parsed Acuity Scheduling lesson notes as a clean card:
 * tumbler up top, tap-to-call/email rows, skill chips, location,
 * and a reschedule button. Falls back to raw text on demand.
 */
export function AcuityNotesView({
  parsed,
  rawNotes,
}: {
  parsed: AcuityNotes
  rawNotes: string
}) {
  const [showRaw, setShowRaw] = useState(false)
  const paid = acuityPaidInFull(parsed.price, parsed.paidOnline)

  return (
    <div className="rounded-xl bg-black/20 p-3">
      {parsed.tumblerName && (
        <div className="mb-2">
          <Eyebrow>Tumbler</Eyebrow>
          <p className="text-lg font-bold leading-tight text-[var(--text)]">
            {parsed.tumblerName}
            {parsed.tumblerAge && (
              <span className="ml-2 text-sm font-medium text-[var(--muted)]">
                Age {parsed.tumblerAge}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {parsed.parentName && <Row label="Parent">{parsed.parentName}</Row>}
        {parsed.phone && (
          <Row label="Phone">
            <a
              href={`tel:${parsed.phone.replace(/\s/g, '')}`}
              className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2"
            >
              {formatPhoneDisplay(parsed.phone)}
            </a>
          </Row>
        )}
        {parsed.email && (
          <Row label="Email">
            <a
              href={`mailto:${parsed.email}`}
              className="block truncate text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2"
            >
              {parsed.email}
            </a>
          </Row>
        )}
        {parsed.price && (
          <Row label="Price">
            <span className="font-medium">{parsed.price}</span>{' '}
            {parsed.paidOnline && (
              <span
                className={`ml-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  paid
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-amber-500/15 text-amber-300'
                }`}
              >
                {paid ? 'Paid in full' : `Paid ${parsed.paidOnline}`}
              </span>
            )}
          </Row>
        )}
      </div>

      {parsed.skills.length > 0 && (
        <div className="mt-3">
          <Eyebrow>Can do without a spot</Eyebrow>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {parsed.skills.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-[var(--text)]"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {parsed.athleteInfo && (
        <div className="mt-3">
          <Eyebrow>Coach notes</Eyebrow>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--text)]">
            {parsed.athleteInfo}
          </p>
        </div>
      )}

      {parsed.location && (
        <div className="mt-3">
          <Eyebrow>Where</Eyebrow>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)]">
            {parsed.location}{' '}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                parsed.location.replace(/\n/g, ', '),
              )}`}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2"
            >
              Maps
            </a>
          </p>
        </div>
      )}

      {parsed.extraSections.map((s) => (
        <div key={s.title} className="mt-3">
          <Eyebrow>{s.title}</Eyebrow>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[var(--text)]">{s.body}</p>
        </div>
      ))}

      {parsed.rescheduleUrl && (
        <a
          href={parsed.rescheduleUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 block rounded-full bg-[var(--accent)] px-4 py-2 text-center text-sm font-semibold text-black"
        >
          Reschedule in Acuity
        </a>
      )}

      <button
        type="button"
        onClick={() => setShowRaw((v) => !v)}
        className="mt-2 text-xs text-[var(--muted)] underline underline-offset-2"
      >
        {showRaw ? 'Hide raw notes' : 'Show raw notes'}
      </button>
      {showRaw && (
        <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-lg bg-black/30 p-2 text-xs leading-relaxed text-[var(--muted)]">
          {rawNotes}
        </p>
      )}
    </div>
  )
}
