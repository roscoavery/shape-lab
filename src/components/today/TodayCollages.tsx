import { useEffect, useState } from 'react'
import type { Athlete } from '../../types'
import { listCollages, saveCollage, type Collage, type CollageSlot } from '../../lib/collages'
import { ShareReference } from '../share/ShareReference'
import { CollageStage } from '../classes/CollageStage'
import { CollageBoardCard } from '../classes/CollageBoardCard'
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
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    void listCollages(viewer?.id).then(setCollages)
  }, [viewer?.id])

  const canPersist = (board: Collage) =>
    Boolean(viewer) &&
    (isCoachProfile(viewer) || board.ownerId === viewer?.id || !board.ownerId)

  const persistBoard = (board: Collage) => {
    if (!canPersist(board)) return
    setSaving(true)
    void saveCollage({ ...board, updatedAt: new Date().toISOString() })
      .then((saved) => {
        if (!saved) {
          setSavedNote('Could not save that collage.')
          return
        }
        setPlaying(saved)
        setDirty(false)
        setCollages((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
        setSavedNote('Saved. Open Collages to keep editing it just like this.')
      })
      .finally(() => {
        setSaving(false)
      })
  }

  const applySlots = (slots: CollageSlot[]) => {
    if (!playing) return
    setPlaying({ ...playing, slots, updatedAt: new Date().toISOString() })
    setDirty(true)
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
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {collages.slice(0, 6).map((c) => (
            <li key={c.id}>
              <CollageBoardCard
                collage={c}
                nameForUrl={nameForUrl}
                onPlay={() => {
                  if (dirty && !confirm('You have unsaved collage edits. Switch boards without saving?')) {
                    return
                  }
                  setPlaying(c)
                  setFullscreen(true)
                  setDirty(false)
                  setSavedNote(null)
                }}
              >
                {viewer ? (
                  <ShareReference
                    viewer={viewer}
                    variant="compact"
                    draft={{
                      kind: 'collage',
                      title: c.name,
                      collageId: c.id,
                    }}
                  />
                ) : null}
              </CollageBoardCard>
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
              if (dirty && !confirm('You have unsaved collage edits. Close without saving?')) {
                return
              }
              setPlaying(null)
              setFullscreen(false)
              setDirty(false)
            }}
            canEdit={false}
            canAssign
            viewerId={viewer?.id ?? null}
            onSlots={applySlots}
            onSaveBoard={canPersist(playing) ? () => persistBoard(playing) : undefined}
            savingBoard={saving}
            boardDirty={dirty}
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
