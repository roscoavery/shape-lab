import { useMemo, useState } from 'react'
import { LICENSE_LABELS, mediaAssetById, mediaSlotById } from '../../content/coachEd/media'
import type { MediaAsset, MediaStatus } from '../../content/coachEd/types'
import { coachEdApi } from './api'
import { useCoachEd } from './CoachEdContext'

export function AttributionLine({ asset }: { asset: MediaAsset }) {
  return (
    <p className="text-[11px] leading-snug text-[var(--muted)]">
      {asset.creditLine}
      {' \u00b7 '}
      <a href={asset.sourcePageUrl} target="_blank" rel="noreferrer" className="underline">
        Source
      </a>
      {' \u00b7 '}
      <a href={asset.licenseUrl} target="_blank" rel="noreferrer" className="underline">
        {LICENSE_LABELS[asset.license]}
      </a>
    </p>
  )
}

function Hotspots({ asset }: { asset: MediaAsset }) {
  const [active, setActive] = useState<string | null>(null)
  const spots = asset.hotspots ?? []
  const w = asset.widthPx ?? 100
  const h = asset.heightPx ?? 100
  if (spots.length === 0) return null
  const current = spots.find((s) => s.id === active)
  return (
    <>
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${(100 * h) / w}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        {spots.map((s) => (
          <circle
            key={s.id}
            cx={s.x}
            cy={(s.y * h) / w}
            r={active === s.id ? 3.4 : 2.6}
            fill="none"
            stroke={active === s.id ? '#f5c542' : '#6ec8d6'}
            strokeWidth={0.9}
          />
        ))}
      </svg>
      {spots.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-label={`Show label: ${s.label}`}
          onClick={() => setActive(active === s.id ? null : s.id)}
          className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        />
      ))}
      {current && (
        <div className="absolute inset-x-2 bottom-2 rounded-lg bg-black/80 px-3 py-2 text-xs text-white">
          <span className="font-semibold">{current.label}</span>
          {current.detail ? <span className="block opacity-80">{current.detail}</span> : null}
        </div>
      )}
    </>
  )
}

export function AdminReview({ asset, onDone }: { asset: MediaAsset; onDone: () => void }) {
  const ctx = useCoachEd()
  const [reviewer, setReviewer] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const act = async (status: MediaStatus) => {
    setBusy(true)
    setErr(null)
    try {
      const next = await coachEdApi.media({ id: asset.id, status, reviewer, note })
      ctx.patch(next)
      onDone()
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-2 space-y-2 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-xs">
      <p className="font-semibold text-amber-200">Admin preview. Coaches do not see this image yet.</p>
      <p className="text-[var(--muted)]">
        Check the labels against a trusted anatomy reference. Approving records your name and note.
      </p>
      <input
        value={reviewer}
        onChange={(e) => setReviewer(e.target.value)}
        placeholder="Your name and role"
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="What you checked, or why you are rejecting"
        rows={2}
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
      />
      {err && <p className="text-red-300">{err}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('approved')}
          className="rounded-full bg-emerald-400 px-4 py-2 text-xs font-semibold text-black disabled:opacity-50"
        >
          Approve image
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void act('rejected')}
          className="rounded-full border border-red-300/50 px-4 py-2 text-xs font-semibold text-red-200 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  )
}

export function PendingVisual({ title, need }: { title: string; need: string }) {
  return (
    <div className="flex min-h-[7rem] flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-white/[0.03] px-4 py-5 text-center">
      <p className="text-sm font-semibold">Verified visual pending</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{title}</p>
      <p className="mt-1 max-w-sm text-xs text-[var(--muted)]">Needs: {need}</p>
    </div>
  )
}

/**
 * Renders the first approved asset behind a media slot. No approved asset
 * means a plain placeholder. Admins also see the next pending asset as a
 * preview with approval controls, so review happens in context.
 */
export function VerifiedFigure({ slotId }: { slotId: string }) {
  const slot = mediaSlotById(slotId)
  const ctx = useCoachEd()
  const [details, setDetails] = useState(false)
  const [, bump] = useState(0)
  const picked = useMemo(() => {
    if (!slot) return null
    const assets = slot.assetIds.map((id) => mediaAssetById(id)).filter((a): a is MediaAsset => Boolean(a))
    const approved = assets.find((a) => ctx.mediaStatusOf(a) === 'approved' && a.localPath)
    if (approved) return { asset: approved, preview: false }
    if (ctx.isAdmin) {
      const pending = assets.find((a) => {
        const s = ctx.mediaStatusOf(a)
        return (s === 'anatomy_pending' || s === 'license_verified') && a.localPath
      })
      if (pending) return { asset: pending, preview: true }
    }
    return null
  }, [slot, ctx])

  if (!slot) return null
  if (!picked) return <PendingVisual title={slot.title} need={slot.need} />
  const { asset, preview } = picked
  const review = ctx.state?.media[asset.id]?.anatomyReview ?? asset.anatomyReview
  return (
    <figure className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <div
        className="relative mx-auto w-full bg-white"
        style={{ aspectRatio: asset.widthPx && asset.heightPx ? `${asset.widthPx} / ${asset.heightPx}` : undefined, maxWidth: 560 }}
      >
        <img src={asset.localPath} alt={asset.altText} loading="lazy" className="h-full w-full object-contain" />
        <Hotspots asset={asset} />
      </div>
      <figcaption className="space-y-1 px-3 py-2">
        <p className="text-xs font-semibold">{asset.title}</p>
        <AttributionLine asset={asset} />
        <button
          type="button"
          onClick={() => setDetails((v) => !v)}
          aria-expanded={details}
          className="text-[11px] font-medium text-[var(--accent)] underline"
        >
          {details ? 'Hide image details' : 'Image details'}
        </button>
        {details && (
          <dl className="space-y-1 text-[11px] leading-snug text-[var(--muted)]">
            <div>
              <dt className="inline font-semibold">License: </dt>
              <dd className="inline">{LICENSE_LABELS[asset.license]}. {asset.modificationAllowed ? 'Changes allowed.' : 'No changes allowed.'}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Checked: </dt>
              <dd className="inline">{asset.verifiedOn}. {asset.verificationEvidence}</dd>
            </div>
            {review && (
              <div>
                <dt className="inline font-semibold">Label check: </dt>
                <dd className="inline">{review.reviewer}, {review.on}. {review.note}</dd>
              </div>
            )}
            {asset.modifications.length > 0 && (
              <div>
                <dt className="inline font-semibold">Changes made: </dt>
                <dd className="inline">{asset.modifications.map((m) => m.what).join(' ')}</dd>
              </div>
            )}
          </dl>
        )}
        {preview && <AdminReview asset={asset} onDone={() => bump((n) => n + 1)} />}
      </figcaption>
    </figure>
  )
}

