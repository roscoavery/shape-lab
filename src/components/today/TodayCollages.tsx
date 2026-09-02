import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { listCollages, saveCollage, type Collage, type CollageSlot } from '../../lib/collages'
import { ShareReference } from '../share/ShareReference'
import { CollageStage } from '../classes/CollageStage'
import { useGymLibrary } from '../../lib/gymLibrary'
import { isCoachProfile } from '../../lib/profileRole'

type Props = {
  viewer: Athlete | null
  onOpenLibrary: () => void
}

export function TodayCollages({ viewer, onOpenLibrary }: Props) {
  const { nameForUrl } = useGymLibrary()
  const [collages, setCollages] = useState<Collage[]>([])
  const [playing, setPlaying] = useState<Collage | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(() => {
    void listCollages(viewer?.id).then(setCollages)
  }, [viewer?.id])

  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Class drills
          </p>
          <h3 className="text-lg font-semibold">Collages</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            All panels play at once. Change the gym clip on any tile, or drop in
            a quick record / Photos upload. Save to Photos exports the board.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenLibrary}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f]"
        >
          Open collages
        </button>
      </div>
      {collages.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">
          No collages yet. Build one on Classes — up to six gym clips on one board.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {collages.slice(0, 6).map((c) => (
            <li
              key={c.id}
              className="rounded-xl border border-[var(--panel-border)] bg-[#0d1218] p-3"
            >
              <p className="truncate text-sm font-semibold">{c.name}</p>
              <p className="text-[11px] text-[var(--muted)]">
                {c.slots.length} panel{c.slots.length === 1 ? '' : 's'}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPlaying(c)
                    setFullscreen(true)
                  }}
                  className="text-xs font-semibold text-[var(--accent)]"
                >
                  Play
                </button>
                {viewer && (
                  <ShareReference
                    viewer={viewer}
                    variant="compact"
                    draft={{
                      kind: 'collage',
                      title: c.name,
                      collageId: c.id,
                    }}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {playing && (
        <div className="mt-3">
          <CollageStage
            collage={playing}
            nameForUrl={nameForUrl}
            fullscreen={fullscreen}
            onFullscreen={setFullscreen}
            onClose={() => {
              setPlaying(null)
              setFullscreen(false)
            }}
            canEdit={false}
            canAssign
            viewerId={viewer?.id ?? null}
            onSlots={(slots: CollageSlot[]) => {
              const next = { ...playing, slots, updatedAt: new Date().toISOString() }
              setPlaying(next)
              const persist =
                Boolean(viewer) &&
                (isCoachProfile(viewer) || playing.ownerId === viewer?.id || !playing.ownerId)
              if (!persist) return
              void saveCollage(next).then((saved) => {
                if (!saved) return
                setPlaying(saved)
                setCollages((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
              })
            }}
          />
        </div>
      )}
    </section>
  )
}
