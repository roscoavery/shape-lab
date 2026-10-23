import { useEffect, useState } from 'react'
import { LICENSE_LABELS, MEDIA_ASSETS } from '../../content/coachEd/media'
import { conditionIndex } from '../../content/coachEd/registry'
import type { MediaAsset, ReviewStatus } from '../../content/coachEd/types'
import { coachEdApi, type RevisionRow } from './api'
import { useCoachEd } from './CoachEdContext'
import { useLessons } from './useLessons'
import { ReviewBadge } from './SafetyBanner'
import { AdminReview, AttributionLine } from './VerifiedFigure'

type Part = 'content' | 'visuals' | 'settings' | 'log'

function ReviewRow({ kind, id, name, authored }: { kind: 'condition' | 'lesson'; id: string; name: string; authored: ReviewStatus }) {
  const ctx = useCoachEd()
  const status = ctx.reviewOf(kind, id, authored)
  const [open, setOpen] = useState(false)
  const [next, setNext] = useState<ReviewStatus>(status)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewerRole, setReviewerRole] = useState('')
  const [note, setNote] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const save = async () => {
    setBusy(true)
    setErr(null)
    try {
      ctx.patch(await coachEdApi.review({ kind, id, status: next, reviewerName, reviewerRole, note }))
      setOpen(false)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 text-left">
        <span className="text-sm font-medium">{name}</span>
        <ReviewBadge status={status} />
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-sm">
          <select value={next} onChange={(e) => setNext(e.target.value as ReviewStatus)} className="w-full rounded-lg border border-white/15 bg-[#0d1218] px-3 py-2">
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="approved">Approved by a qualified reviewer</option>
            <option value="retired">Retired</option>
          </select>
          {next === 'approved' && (
            <>
              <input value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Reviewer name" className="w-full rounded-lg border border-white/15 bg-[#0d1218] px-3 py-2" />
              <input value={reviewerRole} onChange={(e) => setReviewerRole(e.target.value)} placeholder="Reviewer role, for example sports medicine physician" className="w-full rounded-lg border border-white/15 bg-[#0d1218] px-3 py-2" />
              <p className="text-xs text-[var(--muted)]">The app cannot check credentials. This records who you say reviewed it, shown to coaches.</p>
            </>
          )}
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg border border-white/15 bg-[#0d1218] px-3 py-2" />
          {err && <p role="alert" className="text-red-300">{err}</p>}
          <button type="button" disabled={busy} onClick={() => void save()} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--on-accent)] disabled:opacity-50">
            Save
          </button>
        </div>
      )}
    </li>
  )
}

function Content() {
  const lessons = useLessons()
  const conds = conditionIndex().filter((c) => c.completeness === 'complete')
  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">Set review status. Only written entries can be approved. Every change is logged.</p>
      <div>
        <h4 className="mb-2 text-base font-semibold">Injury cards</h4>
        <ul className="space-y-2">{conds.map((c) => <ReviewRow key={c.id} kind="condition" id={c.id} name={c.name} authored={c.review} />)}</ul>
      </div>
      <div>
        <h4 className="mb-2 text-base font-semibold">Lessons</h4>
        <ul className="space-y-2">{(lessons ?? []).map((l) => <ReviewRow key={l.id} kind="lesson" id={l.id} name={l.title} authored={l.review} />)}</ul>
      </div>
    </div>
  )
}

function VisualRow({ asset }: { asset: MediaAsset }) {
  const ctx = useCoachEd()
  const status = ctx.mediaStatusOf(asset)
  const [open, setOpen] = useState(false)
  const [, bump] = useState(0)
  const canReview = (status === 'anatomy_pending' || status === 'license_verified' || status === 'approved') && asset.localPath
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="flex items-start gap-3">
        {asset.localPath ? (
          <img src={asset.localPath} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/20 text-[10px] text-[var(--muted)]">No file</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{asset.title}</p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {status.replace('_', ' ')} &middot; {LICENSE_LABELS[asset.license]}
            {asset.commercialUseAllowed ? '' : ' &middot; no commercial use'}
          </p>
        </div>
      </div>
      <AttributionLine asset={asset} />
      {status === 'rejected' && (
        <p className="mt-1 text-xs text-red-200">Rejected: {ctx.state?.media[asset.id]?.note ?? asset.rejectionReason}</p>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} className="mt-1 text-xs font-semibold text-[var(--accent)] underline">
        {open ? 'Hide record' : 'Show record'}
      </button>
      {open && (
        <div className="mt-1 space-y-1 text-[11px] leading-snug text-[var(--muted)]">
          <p>Creator: {asset.creator}</p>
          <p>Verified {asset.verifiedOn ?? 'not yet'}: {asset.verificationEvidence ?? 'No evidence recorded.'}</p>
          {asset.altText && <p>Alt text: {asset.altText}</p>}
          <p>Used by: {[...asset.conditionIds, ...asset.lessonIds].join(', ') || 'unassigned'}</p>
          {canReview && status !== 'approved' && <AdminReview asset={asset} onDone={() => bump((n) => n + 1)} />}
          {status === 'approved' && (
            <WithdrawButton asset={asset} />
          )}
        </div>
      )}
    </li>
  )
}

function WithdrawButton({ asset }: { asset: MediaAsset }) {
  const ctx = useCoachEd()
  const [busy, setBusy] = useState(false)
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!window.confirm('Take this image back to review? Coaches will see Verified visual pending.')) return
        setBusy(true)
        try {
          ctx.patch(await coachEdApi.media({ id: asset.id, status: 'anatomy_pending', note: 'Approval withdrawn' }))
        } finally {
          setBusy(false)
        }
      }}
      className="rounded-full border border-amber-400/50 px-4 py-1.5 text-xs font-semibold text-amber-200"
    >
      Withdraw approval
    </button>
  )
}

function Visuals() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-[var(--muted)]">
        Every image keeps its license record. Nothing here is AI generated. Coaches only see images marked approved.
      </p>
      <ul className="space-y-2">
        {MEDIA_ASSETS.map((a) => (
          <VisualRow key={a.id} asset={a} />
        ))}
      </ul>
    </div>
  )
}

function Settings() {
  const ctx = useCoachEd()
  const [val, setVal] = useState(String(ctx.state?.passPercent ?? 85))
  const [msg, setMsg] = useState<string | null>(null)
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold" htmlFor="pass-percent">
        Pass mark for assessments (percent)
      </label>
      <input
        id="pass-percent"
        type="number"
        min={50}
        max={100}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        className="w-28 rounded-lg border border-white/15 bg-[#0d1218] px-3 py-2"
      />
      <p className="text-xs text-[var(--muted)]">Default 85. Safety-critical questions must always be right, whatever this is set to.</p>
      <button
        type="button"
        onClick={async () => {
          try {
            ctx.patch(await coachEdApi.settings(Number(val)))
            setMsg('Saved.')
          } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Could not save.')
          }
        }}
        className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-semibold text-[var(--on-accent)]"
      >
        Save
      </button>
      {msg && <p role="status" className="text-sm">{msg}</p>}
    </div>
  )
}

function Log() {
  const [rows, setRows] = useState<RevisionRow[] | null>(null)
  useEffect(() => {
    let live = true
    void coachEdApi.revisions().then((r) => live && setRows(r.revisions)).catch(() => live && setRows([]))
    return () => {
      live = false
    }
  }, [])
  if (!rows) return <p className="text-sm text-[var(--muted)]">Loading</p>
  if (rows.length === 0) return <p className="text-sm text-[var(--muted)]">No changes yet.</p>
  return (
    <ul className="space-y-1.5 text-xs">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
          <span className="font-semibold">{r.kind}</span> {r.targetId}: {r.from} &rarr; {r.to}
          <span className="block text-[var(--muted)]">{r.byName}, {r.at.slice(0, 16).replace('T', ' ')}{r.note ? `. ${r.note}` : ''}</span>
        </li>
      ))}
    </ul>
  )
}

export function AdminTools() {
  const [part, setPart] = useState<Part>('visuals')
  const parts: { id: Part; label: string }[] = [
    { id: 'visuals', label: 'Visuals' },
    { id: 'content', label: 'Content review' },
    { id: 'settings', label: 'Settings' },
    { id: 'log', label: 'Change log' },
  ]
  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1.5 overflow-x-auto pb-1">
        {parts.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={part === p.id}
            onClick={() => setPart(p.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${part === p.id ? 'border-white/60 bg-white/10' : 'border-white/15 text-[var(--muted)]'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {part === 'visuals' && <Visuals />}
      {part === 'content' && <Content />}
      {part === 'settings' && <Settings />}
      {part === 'log' && <Log />}
    </div>
  )
}
