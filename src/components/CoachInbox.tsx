import { useEffect, useState } from 'react'
import type { Athlete, FlowRunReport } from '../types'
import { getCaptureBlob } from '../lib/captureStore'
import { averageScore } from '../lib/flowShare'
import { loadCoachInbox } from '../lib/storage'
import { FlowShareActions } from './FlowShareActions'

type Props = {
  athletes: Athlete[]
}

export function CoachInbox({ athletes }: Props) {
  const [posts, setPosts] = useState<FlowRunReport[]>(() => loadCoachInbox())
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null)

  useEffect(() => {
    setPosts(loadCoachInbox())
  }, [])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview],
  )

  const nameFor = (athleteId: string) =>
    athletes.find((a) => a.id === athleteId)?.name ?? athleteId

  const open = async (r: FlowRunReport) => {
    if (!r.replayCaptureId) return
    const blob = await getCaptureBlob(r.replayCaptureId)
    if (!blob) return
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview({ url: URL.createObjectURL(blob), name: r.sequenceName })
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <p className="mb-1 text-xs uppercase tracking-wider text-[var(--muted)]">Coach inbox</p>
      <h2 className="text-sm font-semibold text-[var(--text)]">Runs sent to Ryan</h2>
      <p className="mt-1 text-[12px] leading-snug text-[var(--muted)]">
        These stay on this device. If an athlete trains on their own phone, they download the
        video and analysis and DM you — then it is not on this list until you open it here.
      </p>
      {posts.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--muted)]">Nothing sent yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {posts.map((p) => {
            const athlete = athletes.find((a) => a.id === p.athleteId) ?? null
            return (
              <li
                key={p.id}
                className="rounded-lg border border-[var(--panel-border)] bg-[#121820] p-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-sm font-medium text-[var(--text)]">
                    {nameFor(p.athleteId)}
                    {p.instagramHandle ? (
                      <span className="text-[var(--muted)]"> @{p.instagramHandle}</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] tabular-nums text-[var(--accent)]">
                    {averageScore(p)}/100
                  </p>
                </div>
                <p className="text-[12px] text-[var(--muted)]">
                  {p.sequenceName} · {new Date(p.sharedWithCoachAt ?? p.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {p.replayCaptureId && (
                    <button
                      type="button"
                      onClick={() => void open(p)}
                      className="rounded-md border border-[var(--panel-border)] px-2 py-1 text-[11px]"
                    >
                      Watch
                    </button>
                  )}
                  <FlowShareActions
                    report={p}
                    athlete={athlete}
                    compact
                    onUpdated={(next) =>
                      setPosts((list) => list.map((x) => (x.id === next.id ? next : x)))
                    }
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {preview && (
        <video
          src={preview.url}
          className="mt-3 max-h-56 w-full rounded-lg bg-black"
          controls
          playsInline
        />
      )}
    </section>
  )
}
