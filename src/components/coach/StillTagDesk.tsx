import { useEffect, useMemo, useState } from 'react'
import { getShape } from '../../config/shapes'
import { listStillTags, type StillTagRow } from '../../lib/stillTags'
import { sessionIsAdmin, type AuthSessionUser } from '../../lib/authSession'
import { InfoHint } from '../ui/InfoHint'

type Props = {
  user: AuthSessionUser
}

export function StillTagDesk({ user }: Props) {
  const admin = sessionIsAdmin(user)
  const [rows, setRows] = useState<StillTagRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listStillTags()
      .then(setRows)
      .catch(() => setError('Could not load tagged stills.'))
  }, [])

  const missing = useMemo(
    () => (admin ? rows.filter((row) => row.needsInstructionalConsent) : []),
    [admin, rows],
  )

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
          More
        </p>
        <div className="mt-1 flex items-center gap-2">
          <h2 className="text-2xl font-semibold text-[var(--text)]">Tagged teaching stills</h2>
          <InfoHint>
            Private tags on Shape Library stills. Names are not shown on the still. Instructional
            media consent is separate from ordinary coaching video.
          </InfoHint>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {admin
            ? 'Athletes already pictured in the library, and whether a parent has allowed instructional use.'
            : 'Shapes where your child is pictured as a teaching still.'}
        </p>
        {error && <p className="mt-2 text-sm text-[var(--bad)]">{error}</p>}
      </section>

      {admin && (
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
          <h3 className="text-lg font-semibold">Needs instructional consent</h3>
          {missing.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              No tagged stills are waiting on instructional/reference permission.
            </p>
          ) : (
            <StillList rows={missing} showConsent />
          )}
        </section>
      )}

      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-5">
        <h3 className="text-lg font-semibold">{admin ? 'All tagged stills' : 'Where they appear'}</h3>
        {rows.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No tagged teaching stills yet.</p>
        ) : (
          <StillList rows={rows} showConsent={admin} />
        )}
      </section>
    </div>
  )
}

function StillList({ rows, showConsent }: { rows: StillTagRow[]; showConsent: boolean }) {
  return (
    <ul className="mt-3 space-y-3">
      {rows.map((row) => {
        const shape = getShape(row.shapeId)
        return (
          <li
            key={row.stillId}
            className="flex gap-3 rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3"
          >
            <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-black">
              {row.dataUrl ? (
                <img src={row.dataUrl} alt="" className="h-full w-full object-contain" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{shape?.name ?? row.label ?? row.shapeId}</p>
              {showConsent ? (
                <ul className="mt-1 space-y-0.5 text-xs text-[var(--muted)]">
                  {row.tagged.map((person) => (
                    <li key={person.athleteId}>
                      {person.name}
                      {person.instructionalMediaConsent
                        ? ` · instructional ${person.instructionalMediaConsent}`
                        : ' · instructional not asked'}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-xs text-[var(--muted)]">Teaching still in the Shape Library</p>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
