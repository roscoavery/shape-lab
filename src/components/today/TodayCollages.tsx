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
  embed?: boolean
}

export function TodayCollages({ viewer, onOpenLibrary, embed = false }: Props) {
  const { nameForUrl } = useGymLibrary()
  const [collages, setCollages] = useState<Collage[]>([])
  const [playing, setPlaying] = useState<Collage | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedNote, setSavedNote] = useState<string | null>(null)

  useEffect(() => {
    void listCollages(viewer?.id).then(setCollages)
  }, [viewer?.id])

  const canPersist = (board: Collage) =>
    Boolean(viewer) &&
    (isCoachProfile(viewer) || board.ownerId === viewer?.id || !board.ownerId)

  const persistBoard = (board: Collage, announce = false) => {
    if (!canPersist(board)) return
    if (announce) setSaving(true)
    void saveCollage({ ...board, updatedAt: new Date().toISOString() })
      .then((saved) => {
        if (!saved) {
          if (announce) setSavedNote('Could not save that collage.')
          return
        }
        setPlaying(saved)
        setCollages((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
        if (announce) {
          setSavedNote('Saved. Open Collages to keep editing it just like this.')
        }
      })
      .finally(() => {
        if (announce) setSaving(false)
      })
  }

  const applySlots = (slots: CollageSlot[]) => {
    if (!playing) return
    const next = { ...playing, slots, updatedAt: new Date().toISOString() }
    setPlaying(next)
    persistBoard(next)
  }

  const body = (
    <>
      <div className="flex flex-wrap items-start justify-between gap-2">
        {!embed ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
              Class drills
            </p>
            <h3 className="text-lg font-semibold">Collages</h3>
            <p className="mt-1 text-sm text-[var(--muted)]">
              All panels play at once. Change the gym clip on any tile, or drop in
              a quick record / Photos upload. Save collage keeps it editable.
            </p>
          </div>
        ) : (
          <p className="text-sm text-white/55">
            Play a board, hide the loops, then Save collage so Classes opens it the same way.
          </p>
        )}
        <button
          type="button"
          onClick={onOpenLibrary}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-bold text-[#06281f]"
        >
          Open collages
        </button>
      </div>
      {savedNote ? (
        <p className="mt-2 rounded-lg border border-[var(--accent)]/40 bg-[#102820] px-3 py-2 text-sm text-[var(--accent)]">
          {savedNote}
        </p>
      ) : null}
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
                    setSavedNote(null)
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
            onSlots={applySlots}
            onSaveBoard={canPersist(playing) ? () => persistBoard(playing, true) : undefined}
            savingBoard={saving}
          />
        </div>
      )}
    </>
  )

  if (embed) return <div>{body}</div>
  return (
    <section className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      {body}
    </section>
  )
}
